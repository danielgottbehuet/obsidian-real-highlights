import type { MarkerConfig } from "./MarkerOptions";
import { NoiseGenerator } from "./NoiseGenerator";
import { PressureModel } from "./PressureModel";
import { SeededRandom, deriveSeed } from "./SeededRandom";

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Vollständig berechnete Geometrie eines einzelnen Markerstrichs.
 * Koordinaten sind relativ zur linken oberen Ecke der Textzeile.
 */
export interface StrokeGeometry {
  /** Absolute Strichhöhe in px. */
  strokeHeight: number;
  /** Horizontaler Versatz der Keilspitze (obere Kante gegenüber unterer Kante). */
  tipShift: number;
  /** Mittelpunkt des Strichanfangs bzw. -endes (Mitte der schrägen Kante). */
  startX: number;
  endX: number;
  /** Abstand der Kontrollpunkte in px. */
  pointSpacing: number;
  /** Kontrollpunkte der Kanten (links → rechts). */
  top: Point[];
  bottom: Point[];
  /** Geschlossener Umriss als SVG-Pfad. */
  outline: string;
  /** Begrenzungsrahmen inkl. Sicherheitsabstand. */
  bounds: Bounds;
  /** Mittellinie (inkl. vertikaler Bewegung) an Position x. */
  centerAt(x: number): number;
  /** Halbe Strichhöhe (inkl. Druck) an Position x. */
  halfHeightAt(x: number): number;
  pressure: PressureModel;
}

/** Rundet für kompakte, stabile SVG-Ausgabe. */
export function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
}

/**
 * Wandelt eine Punktfolge per Catmull-Rom-Spline in kubische Bézier-Segmente um.
 * Liefert nur die "C ..."-Segmente, ohne einleitendes M.
 */
export function catmullRomSegments(points: Point[]): string {
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

/**
 * Berechnet Grundform, Konturen, Keilspitze und vertikale Bewegung.
 *
 * Alle Noise-Funktionen werden in absoluten Koordinaten (skaliert mit der
 * Strichhöhe) ausgewertet – ein langer Strich erhält dadurch mehr Variationen,
 * statt einen kurzen Strich zu strecken.
 */
export function computeStrokeGeometry(
  seed: number,
  width: number,
  height: number,
  cfg: MarkerConfig,
): StrokeGeometry {
  const rnd = new SeededRandom(deriveSeed(seed, "geometry"));
  const driftNoise = new NoiseGenerator(deriveSeed(seed, "drift"));
  const topNoise = new NoiseGenerator(deriveSeed(seed, "edge-top"));
  const bottomNoise = new NoiseGenerator(deriveSeed(seed, "edge-bottom"));
  const sharedNoise = new NoiseGenerator(deriveSeed(seed, "edge-shared"));

  const H = Math.max(0.5, height * cfg.strokeHeight);
  const cy = height / 2 + cfg.verticalOffset * height;

  // --- Länge, Überstand, Keilspitze -------------------------------------------------
  const over = cfg.overshoot * H;
  const startX = -over * (0.65 + 0.7 * rnd.next());
  const endX = width + over * (0.65 + 0.7 * rnd.next());
  const tipRad = (cfg.tipAngle * Math.PI) / 180;
  // Die Spitze wird leicht unterschiedlich gehalten (±8 %).
  const tipShift = H * Math.tan(tipRad) * (0.92 + 0.16 * rnd.next());
  const length = Math.max(0, endX - startX);

  // --- Vertikale Bewegung -------------------------------------------------------------
  const driftAmp = cfg.verticalDrift * H * 0.13;
  // Leichte Gesamtneigung, begrenzt auf einen Bruchteil der Strichhöhe.
  const maxTilt = cfg.verticalDrift * H * 0.22;
  const tiltTotal = rnd.signed() * maxTilt;
  const tiltPerPx = length > 0 ? tiltTotal / Math.max(length, H * 8) : 0;
  const midX = (startX + endX) / 2;
  const driftScale = H * 7;

  const pressure = new PressureModel(seed, H, cfg.pressureVariation);

  const centerAt = (x: number) =>
    cy + driftAmp * driftNoise.fbm(x / driftScale, 2, 2.1, 0.4) + tiltPerPx * (x - midX);

  const halfHeightAt = (x: number) => (H / 2) * (1 + 0.08 * pressure.at(x));

  // --- Organische Kontur ---------------------------------------------------------------
  const roughAmp = cfg.roughness * H * 0.05;
  const edgeScale = H * 1.15;
  const edgeOffset = (noise: NoiseGenerator, x: number) =>
    roughAmp * (0.75 * noise.fbm(x / edgeScale, 3, 2.2, 0.42) + 0.25 * sharedNoise.fbm(x / (edgeScale * 2.5), 2));

  const pointSpacing = Math.max(1, H * 0.34);
  const segments = Math.max(3, Math.ceil(length / pointSpacing));

  const bottomStart = startX - tipShift / 2;
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const xb = bottomStart + t * length;
    const xt = xb + tipShift;
    top.push({ x: xt, y: centerAt(xt) - halfHeightAt(xt) + edgeOffset(topNoise, xt) });
    bottom.push({ x: xb, y: centerAt(xb) + halfHeightAt(xb) + edgeOffset(bottomNoise, xb) });
  }

  // --- Strichenden: leicht gewölbte, schräge Kanten -------------------------------------
  const capBulge = () => H * (0.025 + 0.045 * rnd.next()) * (0.6 + cfg.roughness);
  const endBulge = capBulge();
  const startBulge = capBulge();
  const b0 = bottom[0];
  const bn = bottom[bottom.length - 1];
  const t0 = top[0];
  const tn = top[top.length - 1];
  const endCap =
    ` C${fmt(bn.x + endBulge)} ${fmt(bn.y - (bn.y - tn.y) * 0.3)}` +
    ` ${fmt(tn.x + endBulge)} ${fmt(tn.y + (bn.y - tn.y) * 0.3)} ${fmt(tn.x)} ${fmt(tn.y)}`;
  const startCap =
    ` C${fmt(t0.x - startBulge)} ${fmt(t0.y + (b0.y - t0.y) * 0.3)}` +
    ` ${fmt(b0.x - startBulge)} ${fmt(b0.y - (b0.y - t0.y) * 0.3)} ${fmt(b0.x)} ${fmt(b0.y)}`;

  const outline =
    `M${fmt(b0.x)} ${fmt(b0.y)}` +
    catmullRomSegments(bottom) +
    endCap +
    catmullRomSegments([...top].reverse()) +
    startCap +
    " Z";

  // --- Begrenzung ------------------------------------------------------------------------
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of top) minY = Math.min(minY, p.y);
  for (const p of bottom) maxY = Math.max(maxY, p.y);
  const pad = H * 0.25 + 2;
  const minX = Math.min(b0.x, t0.x) - startBulge;
  const maxX = Math.max(bn.x, tn.x) + endBulge;
  const bounds: Bounds = {
    x: Math.floor(minX - pad),
    y: Math.floor(minY - pad),
    width: Math.ceil(maxX - minX + 2 * pad),
    height: Math.ceil(maxY - minY + 2 * pad),
  };

  return {
    strokeHeight: H,
    tipShift,
    startX,
    endX,
    pointSpacing,
    top,
    bottom,
    outline,
    bounds,
    centerAt,
    halfHeightAt,
    pressure,
  };
}
