import { computeInkTexture } from "./InkTexture";
import type { MarkerConfig, MarkerLayers, MarkerOptions } from "./MarkerOptions";
import {
  ALGORITHM_VERSION,
  DEFAULT_LAYERS,
  LIMITS,
  clamp,
  normalizeConfig,
  pickConfig,
  stableSerialize,
} from "./MarkerOptions";
import { fnv1a, lineSeed, textSeed } from "./SeededRandom";
import { computeStrokeGeometry } from "./StrokeGeometry";
import { renderSvg, sanitizeId } from "./SvgRenderer";

export interface MarkerResult {
  /** Eigenständiges SVG-Dokument des Markerstrichs. */
  svg: string;
  /** Effektiver Seed dieser Zeile (nach Ableitung aus Basis-Seed und Zeilenindex). */
  seed: number;
  /** Basis-Seed der Textpassage (automatisch oder Override). */
  baseSeed: number;
  /** Abmessungen des SVG in px. */
  width: number;
  height: number;
  /** Position des SVG relativ zur linken oberen Ecke der Textzeile. */
  offsetX: number;
  offsetY: number;
  algorithmVersion: string;
  /** Deterministischer Schlüssel aller renderrelevanten Eingaben. */
  cacheKey: string;
  stats: { controlPoints: number; fiberPaths: number; strokeHeight: number };
}

export interface ResolvedInput {
  config: MarkerConfig;
  layers: MarkerLayers;
  width: number;
  height: number;
  baseSeed: number;
  seed: number;
  lineIndex: number;
  debug: boolean;
}

/** Normalisiert alle Eingaben und berechnet die Seeds (rein, ohne Seiteneffekte). */
export function resolveInput(options: MarkerOptions): ResolvedInput {
  const text = typeof options.text === "string" ? options.text : "";
  const lineIndex = Math.max(0, Math.floor(clamp(options.lineIndex ?? 0, 0, 1e6)));
  const hasOverride = typeof options.seed === "number" && Number.isFinite(options.seed);
  const baseSeed = hasOverride ? Math.floor(Math.abs(options.seed as number)) >>> 0 : textSeed(text);
  return {
    config: normalizeConfig(pickConfig(options)),
    layers: { ...DEFAULT_LAYERS, ...(options.layers ?? {}) },
    width: clamp(options.width, LIMITS.minWidth, LIMITS.maxWidth),
    height: clamp(options.height, LIMITS.minHeight, LIMITS.maxHeight),
    baseSeed,
    seed: lineSeed(baseSeed, lineIndex),
    lineIndex,
    debug: options.debug === true,
  };
}

/** Cache-Key: alle renderrelevanten Parameter inkl. Algorithmusversion. */
export function computeCacheKey(r: ResolvedInput): string {
  return fnv1a(
    stableSerialize({
      seed: r.seed,
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height * 100) / 100,
      config: r.config,
      layers: r.layers,
      debug: r.debug,
      algorithmVersion: ALGORITHM_VERSION,
    }),
  ).toString(36);
}

/**
 * Zentrale, reine Generierungsfunktion für einen einzelnen Markerstrich (eine visuelle Zeile).
 * Identische Eingaben erzeugen immer exakt dasselbe SVG.
 */
export function generateMarker(options: MarkerOptions): MarkerResult {
  const r = resolveInput(options);
  const cacheKey = computeCacheKey(r);
  const idPrefix = sanitizeId(options.idPrefix ?? `rm-${cacheKey}`);

  const geo = computeStrokeGeometry(r.seed, r.width, r.height, r.config);
  const ink = computeInkTexture(r.seed, geo, r.config, r.layers);
  const svg = renderSvg({
    idPrefix,
    seed: r.seed,
    version: ALGORITHM_VERSION,
    geo,
    ink,
    cfg: r.config,
    layers: r.layers,
    debug: r.debug,
  });

  return {
    svg,
    seed: r.seed,
    baseSeed: r.baseSeed,
    width: geo.bounds.width,
    height: geo.bounds.height,
    offsetX: geo.bounds.x,
    offsetY: geo.bounds.y,
    algorithmVersion: ALGORITHM_VERSION,
    cacheKey,
    stats: {
      controlPoints: geo.top.length + geo.bottom.length,
      fiberPaths: ink.fibers.length,
      strokeHeight: geo.strokeHeight,
    },
  };
}

export interface LineBox {
  /** Position relativ zum Bezugscontainer. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedMarker extends MarkerResult {
  lineIndex: number;
  /** Absolute Position des SVG im Bezugscontainer. */
  x: number;
  y: number;
}

/**
 * Erzeugt für jede visuelle Zeile einer Passage einen eigenständigen Strich.
 * Der Basis-Seed hängt nur vom Text (oder Override) ab, jede Zeile erhält
 * hash(`${baseSeed}:${lineIndex}`).
 */
export function generateMarkerLines(
  text: string,
  lines: LineBox[],
  options: Omit<MarkerOptions, "text" | "width" | "height" | "lineIndex"> = {},
): PositionedMarker[] {
  return lines.map((line, lineIndex) => {
    const res = generateMarker({
      ...options,
      text,
      width: line.width,
      height: line.height,
      lineIndex,
      idPrefix: options.idPrefix ? `${options.idPrefix}-${lineIndex}` : undefined,
    });
    return { ...res, lineIndex, x: line.x + res.offsetX, y: line.y + res.offsetY };
  });
}

export interface MarkerEngine {
  generate(options: MarkerOptions): MarkerResult;
}

export const markerEngine: MarkerEngine = { generate: generateMarker };
