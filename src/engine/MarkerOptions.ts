/**
 * Optionen, Parameterbereiche und Normalisierung der Marker-Engine.
 *
 * Alle Werte werden vor der Generierung in sichere Bereiche geklemmt, damit
 * auch extreme oder ungültige Eingaben (NaN, Infinity, negative Größen)
 * niemals zu ungültigen SVG-Geometrien führen.
 */

export const ALGORITHM_VERSION = "1.0.0";

export type BlendMode = "multiply" | "normal" | "screen" | "darken" | "lighten";

/** Renderrelevante Marker-Konfiguration (ohne Text und Abmessungen). */
export interface MarkerConfig {
  /** Grundfarbe als Hex-Wert (#rgb oder #rrggbb). */
  color: string;
  /** Allgemeine Deckkraft 0..1. */
  opacity: number;
  /** Strichhöhe relativ zur Zeilenhöhe der Textpassage. */
  strokeHeight: number;
  /** Unregelmäßigkeit der Strichkanten 0..1. */
  roughness: number;
  /** Vertikale Bewegung des gesamten Strichs 0..1. */
  verticalDrift: number;
  /** Schwankung des Anpressdrucks 0..1. */
  pressureVariation: number;
  /** Sichtbarkeit der Faserstruktur 0..1. */
  fiberIntensity: number;
  /** Dichte der Faserstruktur 0..1. */
  fiberDensity: number;
  /** Feine Unregelmäßigkeiten im Tintenauftrag 0..1. */
  inkGrain: number;
  /** Winkel der Keilspitze in Grad. */
  tipAngle: number;
  /** Tintenansammlung am Strichanfang 0..1. */
  startInk: number;
  /** Tintenansammlung am Strichende 0..1. */
  endInk: number;
  /** Überstand über den Textbereich in Strichhöhen. */
  overshoot: number;
  /** (Erweiterung) Dunklere Ränder durch Tintenansammlung an den Spitzenkanten 0..1. */
  edgeInk: number;
  /** (Erweiterung) Vertikaler Versatz des Strichs relativ zur Zeilenhöhe (+ = nach unten). */
  verticalOffset: number;
  /** (Erweiterung) Mischmodus mit dem Hintergrund. */
  blendMode: BlendMode;
}

/** Einzelne Rendering-Ebenen, z. B. für Debugging abschaltbar. */
export interface MarkerLayers {
  base: boolean;
  pooling: boolean;
  edges: boolean;
  fibers: boolean;
  grain: boolean;
}

export interface MarkerOptions extends Partial<MarkerConfig> {
  /** Markierter Text (bestimmt den Seed). */
  text: string;
  /** Gerenderte Breite der Zeile in px. */
  width: number;
  /** Gerenderte Höhe der Zeile in px. */
  height: number;
  /** Manueller Seed-Override. Ohne Angabe wird der Seed aus dem Text berechnet. */
  seed?: number;
  /** Index der visuellen Zeile (0 für die erste Zeile). */
  lineIndex?: number;
  /** Präfix für SVG-IDs. Beeinflusst nur IDs, nicht die Geometrie. */
  idPrefix?: string;
  /** Einzelne Ebenen ein-/ausschalten. */
  layers?: Partial<MarkerLayers>;
  /** Kontrollpunkte und Hilfslinien zusätzlich ausgeben. */
  debug?: boolean;
}

export interface ParamSpec {
  key: keyof MarkerConfig;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

/** Numerische Parameter mit gültigen Bereichen (auch für UI-Slider verwendbar). */
export const PARAM_SPECS: ParamSpec[] = [
  { key: "opacity", label: "Opacity", description: "Allgemeine Deckkraft", min: 0, max: 1, step: 0.01 },
  { key: "strokeHeight", label: "Stroke Height", description: "Relative Höhe des Markerstrichs", min: 0.3, max: 1.6, step: 0.01 },
  { key: "roughness", label: "Edge Roughness", description: "Unregelmäßigkeit der Strichkanten", min: 0, max: 1, step: 0.01 },
  { key: "verticalDrift", label: "Vertical Drift", description: "Vertikale Bewegung des Strichs", min: 0, max: 1, step: 0.01 },
  { key: "pressureVariation", label: "Pressure Variation", description: "Schwankung des Tintenauftrags", min: 0, max: 1, step: 0.01 },
  { key: "fiberIntensity", label: "Fiber Intensity", description: "Sichtbarkeit der Faserstruktur", min: 0, max: 1, step: 0.01 },
  { key: "fiberDensity", label: "Fiber Density", description: "Dichte der Faserstruktur", min: 0, max: 1, step: 0.01 },
  { key: "inkGrain", label: "Ink Grain", description: "Feine Unregelmäßigkeiten im Tintenauftrag", min: 0, max: 1, step: 0.01 },
  { key: "tipAngle", label: "Tip Angle", description: "Winkel der Keilspitze", min: 0, max: 50, step: 0.5, unit: "°" },
  { key: "startInk", label: "Start Ink", description: "Tintenansammlung am Strichanfang", min: 0, max: 1, step: 0.01 },
  { key: "endInk", label: "End Ink", description: "Tintenansammlung am Strichende", min: 0, max: 1, step: 0.01 },
  { key: "overshoot", label: "Overshoot", description: "Überstand über den Textbereich (in Strichhöhen)", min: 0, max: 1, step: 0.01 },
  { key: "edgeInk", label: "Edge Ink", description: "Dunklere Strichränder", min: 0, max: 1, step: 0.01 },
  { key: "verticalOffset", label: "Vertical Offset", description: "Vertikaler Versatz relativ zur Zeilenhöhe", min: -0.3, max: 0.3, step: 0.01 },
];

export const DEFAULT_CONFIG: MarkerConfig = {
  color: "#ffe81a",
  opacity: 0.85,
  strokeHeight: 0.94,
  roughness: 0.3,
  verticalDrift: 0.3,
  pressureVariation: 0.35,
  fiberIntensity: 0.35,
  fiberDensity: 0.55,
  inkGrain: 0.25,
  tipAngle: 14,
  startInk: 0.4,
  endInk: 0.5,
  overshoot: 0.22,
  edgeInk: 0.35,
  verticalOffset: 0.04,
  blendMode: "multiply",
};

export const DEFAULT_LAYERS: MarkerLayers = {
  base: true,
  pooling: true,
  edges: true,
  fibers: true,
  grain: true,
};

const BLEND_MODES: BlendMode[] = ["multiply", "normal", "screen", "darken", "lighten"];

/** Größenlimits, damit auch extreme Layouts beherrschbar bleiben. */
export const LIMITS = {
  minWidth: 0,
  maxWidth: 20000,
  minHeight: 1,
  maxHeight: 2000,
};

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Normalisiert eine Farbe auf #rrggbb. Ungültige Werte fallen auf den Standard zurück. */
export function normalizeColor(color: unknown, fallback = DEFAULT_CONFIG.color): string {
  if (typeof color !== "string") return fallback;
  const c = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{3}$/.test(c)) return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  return fallback;
}

/** Ergänzt fehlende Werte und klemmt alle Parameter in ihre gültigen Bereiche. */
export function normalizeConfig(input: Partial<MarkerConfig> = {}): MarkerConfig {
  const out: MarkerConfig = { ...DEFAULT_CONFIG };
  for (const spec of PARAM_SPECS) {
    const raw = num(input[spec.key], DEFAULT_CONFIG[spec.key] as number);
    (out[spec.key] as number) = clamp(raw, spec.min, spec.max);
  }
  out.color = normalizeColor(input.color);
  out.blendMode = BLEND_MODES.includes(input.blendMode as BlendMode)
    ? (input.blendMode as BlendMode)
    : DEFAULT_CONFIG.blendMode;
  return out;
}

/** Extrahiert ausschließlich die Konfigurationsfelder aus beliebigen Optionen. */
export function pickConfig(options: Partial<MarkerConfig>): Partial<MarkerConfig> {
  const out: Partial<MarkerConfig> = {};
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof MarkerConfig)[]) {
    if (options[key] !== undefined) (out as Record<string, unknown>)[key] = options[key];
  }
  return out;
}

export function hexToRgb(hex: string): [number, number, number] {
  const c = normalizeColor(hex);
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/**
 * Deterministische, schlüsselsortierte Serialisierung (für Cache-Keys).
 * Zahlen werden unverändert über JSON serialisiert.
 */
export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableSerialize(obj[k])).join(",") + "}";
}
