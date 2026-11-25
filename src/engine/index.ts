/**
 * Öffentliche Schnittstelle der RealMarker-Rendering-Engine.
 * Die Engine ist DOM-, Obsidian- und UI-unabhängig.
 */
export * from "./MarkerOptions";
export * from "./MarkerEngine";
export * from "./MarkerPresets";
export { SeededRandom, fnv1a, mix32, hashInt, deriveSeed, textSeed, lineSeed } from "./SeededRandom";
export { NoiseGenerator } from "./NoiseGenerator";
export { PressureModel } from "./PressureModel";
export { computeStrokeGeometry, catmullRomSegments } from "./StrokeGeometry";
export type { StrokeGeometry, Point, Bounds } from "./StrokeGeometry";
export { computeInkTexture, BASE_INTENSITY } from "./InkTexture";
export { renderSvg, sanitizeId } from "./SvgRenderer";
