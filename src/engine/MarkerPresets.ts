import type { MarkerConfig } from "./MarkerOptions";
import { DEFAULT_CONFIG, normalizeConfig } from "./MarkerOptions";

export type PresetId = "classic" | "pastel" | "dry" | "quick" | "heavy";

export interface MarkerPreset {
  id: PresetId;
  name: string;
  description: string;
  /** Abweichungen vom Classic-Standard. Presets sind reine Konfigurationen derselben Engine. */
  config: Partial<MarkerConfig>;
}

export const MARKER_PRESETS: MarkerPreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Fluoreszierender Textmarker, gleichmäßig und kräftig, subtile Faserstruktur.",
    config: {},
  },
  {
    id: "pastel",
    name: "Pastel",
    description: "Weicher, weniger intensiver Marker mit dezenter Farbgebung.",
    config: {
      opacity: 0.5,
      pressureVariation: 0.25,
      fiberIntensity: 0.22,
      fiberDensity: 0.45,
      inkGrain: 0.15,
      startInk: 0.25,
      endInk: 0.3,
      edgeInk: 0.2,
    },
  },
  {
    id: "dry",
    name: "Dry Marker",
    description: "Leicht ausgetrocknet: stärkere Fasern, teilweise unvollständiger Tintenauftrag.",
    config: {
      opacity: 0.7,
      roughness: 0.45,
      pressureVariation: 0.6,
      fiberIntensity: 0.85,
      fiberDensity: 0.8,
      inkGrain: 0.75,
      startInk: 0.2,
      endInk: 0.15,
      edgeInk: 0.15,
    },
  },
  {
    id: "quick",
    name: "Quick Stroke",
    description: "Schnell gezogen: mehr vertikale Bewegung, ungleichmäßiger Tintenauftrag.",
    config: {
      roughness: 0.4,
      verticalDrift: 0.75,
      pressureVariation: 0.65,
      fiberIntensity: 0.45,
      fiberDensity: 0.6,
      inkGrain: 0.35,
      tipAngle: 20,
      startInk: 0.2,
      endInk: 0.25,
      overshoot: 0.35,
    },
  },
  {
    id: "heavy",
    name: "Heavy Ink",
    description: "Satter Strich mit höherer Farbintensität und stärkerer Tintenansammlung.",
    config: {
      opacity: 0.92,
      strokeHeight: 0.98,
      pressureVariation: 0.25,
      fiberIntensity: 0.25,
      fiberDensity: 0.5,
      inkGrain: 0.12,
      startInk: 0.85,
      endInk: 0.95,
      edgeInk: 0.6,
    },
  },
];

export interface MarkerColor {
  id: string;
  name: string;
  hex: string;
}

export const MARKER_COLORS: MarkerColor[] = [
  { id: "yellow", name: "Gelb", hex: "#ffe81a" },
  { id: "pink", name: "Pink", hex: "#ff6fae" },
  { id: "green", name: "Grün", hex: "#7cf05c" },
  { id: "orange", name: "Orange", hex: "#ffa63d" },
  { id: "blue", name: "Blau", hex: "#5cc8ff" },
  { id: "violet", name: "Violett", hex: "#be95ff" },
];

export function getPreset(id: string): MarkerPreset {
  return MARKER_PRESETS.find((p) => p.id === id) ?? MARKER_PRESETS[0];
}

/** Vollständige Konfiguration eines Presets, optional mit anderer Farbe. */
export function presetConfig(id: string, color?: string): MarkerConfig {
  const preset = getPreset(id);
  return normalizeConfig({ ...DEFAULT_CONFIG, ...preset.config, ...(color ? { color } : {}) });
}

export function colorHex(idOrHex: string): string {
  return MARKER_COLORS.find((c) => c.id === idOrHex)?.hex ?? idOrHex;
}

export type Theme = "light" | "dark";

/**
 * Farbstrategie je nach Hintergrund.
 *
 * Hell: Multiply – der Marker verhält sich wie lasierende Tinte auf Papier und
 * Überlappungen werden automatisch dunkler.
 * Dunkel: Multiply würde die Farbe auf dunklem Grund nahezu auslöschen. Daher
 * normale Überblendung mit reduzierter Deckkraft, damit heller Text lesbar bleibt.
 */
export function adaptConfigForTheme(cfg: MarkerConfig, theme: Theme): MarkerConfig {
  if (theme === "light") return cfg;
  return {
    ...cfg,
    blendMode: "normal",
    opacity: Math.min(1, cfg.opacity * 0.5),
    // Hellere Fehlstellen wirken auf dunklem Grund wie Schmutz -> dezenter.
    fiberIntensity: cfg.fiberIntensity * 0.35,
    inkGrain: cfg.inkGrain * 0.3,
  };
}
