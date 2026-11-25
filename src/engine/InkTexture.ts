import type { MarkerConfig, MarkerLayers } from "./MarkerOptions";
import { clamp } from "./MarkerOptions";
import { NoiseGenerator } from "./NoiseGenerator";
import { SeededRandom, deriveSeed } from "./SeededRandom";
import type { StrokeGeometry } from "./StrokeGeometry";
import { fmt } from "./StrokeGeometry";

/**
 * Basisintensität des Tintenauftrags in der Luminanzmaske (0..1).
 * Werte darüber entstehen durch Tintenansammlung, Ränder und dunkle Fasern.
 */
export const BASE_INTENSITY = 0.8;

export interface GradientStop {
  offset: number;
  intensity: number;
}

/** Faserpfade, gebündelt nach Typ und Stufe (wenige SVG-Elemente pro Strich). */
export interface FiberBucket {
  /** "dark" = mehr Tinte, "light" = weniger Tinte. */
  kind: "dark" | "light";
  width: number;
  opacity: number;
  d: string;
}

export interface GrainSpec {
  seed: number;
  baseFrequencyX: number;
  baseFrequencyY: number;
  /** feColorMatrix-Koeffizienten für den Alphakanal: A = slope * R + intercept. */
  slope: number;
  intercept: number;
}

export interface InkTexture {
  stops: GradientStop[];
  fibers: FiberBucket[];
  grain: GrainSpec | null;
  edges: { width: number; opacity: number }[];
}

/**
 * Intensitätsverlauf entlang des Strichs (Anpressdruck + Tintenansammlung).
 * Die Stützstellen sind an den Enden dichter, um die Ansammlung weich abzubilden.
 */
function computeStops(geo: StrokeGeometry, cfg: MarkerConfig, layers: MarkerLayers): GradientStop[] {
  const H = geo.strokeHeight;
  const len = geo.endX - geo.startX;
  if (len <= 0) return [{ offset: 0, intensity: BASE_INTENSITY }, { offset: 1, intensity: BASE_INTENSITY }];

  const xs = new Set<number>();
  const endDistances = [0, 0.06, 0.14, 0.25, 0.4, 0.6, 0.85, 1.2, 1.7];
  for (const d of endDistances) {
    xs.add(geo.startX + d * H);
    xs.add(geo.endX - d * H);
  }
  const spacing = Math.max(H * 0.7, len / 48);
  for (let x = geo.startX; x <= geo.endX; x += spacing) xs.add(x);

  const startDecay = H * 0.42;
  const endDecay = H * 0.34;
  const intensity = (x: number) => {
    let v = BASE_INTENSITY * (1 + 0.22 * geo.pressure.at(x));
    if (layers.pooling) {
      const ds = Math.max(0, x - geo.startX);
      const de = Math.max(0, geo.endX - x);
      v += cfg.startInk * 0.26 * Math.exp(-ds / startDecay);
      v += cfg.endInk * 0.3 * Math.exp(-de / endDecay);
    }
    return clamp(v, 0, 1);
  };

  return [...xs]
    .filter((x) => x >= geo.startX && x <= geo.endX)
    .sort((a, b) => a - b)
    .map((x) => ({ offset: clamp((x - geo.startX) / len, 0, 1), intensity: intensity(x) }));
}

/** Erzeugt überwiegend horizontale, teilweise unterbrochene Faserstrukturen. */
function computeFibers(seed: number, geo: StrokeGeometry, cfg: MarkerConfig): FiberBucket[] {
  if (cfg.fiberIntensity <= 0 || cfg.fiberDensity <= 0) return [];
  const rnd = new SeededRandom(deriveSeed(seed, "fibers"));
  const wobble = new NoiseGenerator(deriveSeed(seed, "fiber-wobble"));
  const H = geo.strokeHeight;

  const levels = 4;
  const widths = [0.014, 0.024, 0.038, 0.06].map((w) => Math.max(0.35, w * H));
  const darkOpacity = [0.55, 0.42, 0.3, 0.2].map((o) => o * cfg.fiberIntensity);
  const lightOpacity = [0.32, 0.24, 0.17, 0.11].map((o) => o * cfg.fiberIntensity);
  const paths: Record<string, string> = {};

  const count = Math.round(4 + cfg.fiberDensity * 26);
  // Wahrscheinlichkeit, dass ein Abschnitt tatsächlich gezeichnet wird.
  const presence = 0.35 + 0.55 * cfg.fiberDensity;
  const xMin = geo.top[0].x - geo.tipShift - H * 0.2;
  const xMax = geo.top[geo.top.length - 1].x + H * 0.2;
  const sampleStep = Math.max(2, H * 0.55);

  for (let f = 0; f < count; f++) {
    // Stratifizierte vertikale Position mit Jitter -> keine gleichmäßige Schraffur.
    const v = clamp(-0.5 + (f + rnd.next()) / count, -0.48, 0.48);
    const fiberOffset = rnd.range(0, 1000);
    let x = xMin - rnd.range(0, H * 3);
    while (x < xMax) {
      const segLen = H * (0.5 + Math.pow(rnd.next(), 2) * 7.5);
      const gap = H * (0.1 + rnd.next() * 1.4);
      if (rnd.chance(presence)) {
        const kind = rnd.chance(0.5) ? "dark" : "light";
        const level = Math.min(levels - 1, Math.floor(rnd.next() * levels));
        const key = `${kind}${level}`;
        const x0 = Math.max(x, xMin);
        const x1 = Math.min(x + segLen, xMax);
        if (x1 - x0 > H * 0.2) {
          const steps = Math.max(1, Math.ceil((x1 - x0) / sampleStep));
          let d = "";
          for (let s = 0; s <= steps; s++) {
            const px = x0 + ((x1 - x0) * s) / steps;
            const py =
              geo.centerAt(px) + v * 2 * geo.halfHeightAt(px) + H * 0.014 * wobble.value(px / (H * 2) + fiberOffset);
            d += `${s === 0 ? "M" : "L"}${fmt(px)} ${fmt(py)}`;
          }
          paths[key] = (paths[key] ?? "") + d;
        }
      }
      x += segLen + gap;
    }
  }

  const buckets: FiberBucket[] = [];
  for (const kind of ["dark", "light"] as const) {
    for (let l = 0; l < levels; l++) {
      const d = paths[`${kind}${l}`];
      if (!d) continue;
      buckets.push({
        kind,
        width: widths[l],
        opacity: kind === "dark" ? darkOpacity[l] : lightOpacity[l],
        d,
      });
    }
  }
  return buckets;
}

function computeGrain(seed: number, geo: StrokeGeometry, cfg: MarkerConfig): GrainSpec | null {
  if (cfg.inkGrain <= 0) return null;
  const H = geo.strokeHeight;
  // fractalNoise liefert Werte um 0.5. Nur Bereiche oberhalb der Schwelle werden
  // zu Fehlstellen (weniger Tinte). Die Stärke skaliert mit inkGrain.
  const threshold = 0.5 - 0.1 * cfg.inkGrain;
  const slope = 0.25 + 1.6 * cfg.inkGrain;
  return {
    seed: seed % 100000,
    // Horizontal gestreckt -> leicht faserige, papierähnliche Struktur.
    baseFrequencyX: 0.45 / H,
    baseFrequencyY: 7 / H,
    slope,
    intercept: -threshold * slope,
  };
}

export function computeInkTexture(
  seed: number,
  geo: StrokeGeometry,
  cfg: MarkerConfig,
  layers: MarkerLayers,
): InkTexture {
  const H = geo.strokeHeight;
  return {
    stops: computeStops(geo, cfg, layers),
    fibers: layers.fibers ? computeFibers(seed, geo, cfg) : [],
    grain: layers.grain ? computeGrain(seed, geo, cfg) : null,
    edges:
      layers.edges && cfg.edgeInk > 0
        ? [
            { width: H * 0.2, opacity: cfg.edgeInk * 0.18 },
            { width: H * 0.07, opacity: cfg.edgeInk * 0.32 },
          ]
        : [],
  };
}
