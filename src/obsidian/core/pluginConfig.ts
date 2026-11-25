/**
 * Plugin-Einstellungen und deren Abbildung auf die Engine-Konfiguration.
 * Bewusst ohne Abhängigkeit zu "obsidian", damit testbar.
 */
import type { BlendMode, MarkerConfig, PresetId, Theme } from "../../engine";
import { MARKER_PRESETS, adaptConfigForTheme, clamp, normalizeColor, presetConfig } from "../../engine";
import type { HighlightColor } from "./highlightColors";
import { DEFAULT_PALETTE, HIGHLIGHT_COLORS } from "./highlightColors";

export interface RealHighlightsSettings {
  /** Realistische Striche im Reading Mode. */
  readingMode: boolean;
  /** Realistische Striche im Live Preview (der Source Mode bleibt immer unverändert). */
  livePreview: boolean;

  preset: PresetId;
  /** Farbe für ==Markierungen== ohne Farbangabe. */
  color: string;
  /** Markerfarben für die farbigen Obsidian-Highlights (==🔴Text== usw.). */
  palette: Record<HighlightColor, string>;

  /** Werte, die beim Wechsel des Presets auf dessen Standard zurückgesetzt werden. */
  opacity: number;
  strokeHeight: number;
  roughness: number;
  fiberIntensity: number;
  /** Multiplikator für Tintenansammlung an Anfang und Ende (0–2). */
  inkIntensity: number;

  lightBlendMode: BlendMode;
  darkBlendMode: BlendMode;
  /** Deckkraftfaktor im Dark Mode (0.1–1). */
  darkOpacity: number;
}

export function presetSettingValues(preset: PresetId): Pick<
  RealHighlightsSettings,
  "opacity" | "strokeHeight" | "roughness" | "fiberIntensity" | "inkIntensity"
> {
  const cfg = presetConfig(preset);
  return {
    opacity: cfg.opacity,
    strokeHeight: cfg.strokeHeight,
    roughness: cfg.roughness,
    fiberIntensity: cfg.fiberIntensity,
    inkIntensity: 1,
  };
}

export const DEFAULT_SETTINGS: RealHighlightsSettings = {
  readingMode: true,
  livePreview: true,
  preset: "classic",
  color: "#ffe81a",
  palette: { ...DEFAULT_PALETTE },
  ...presetSettingValues("classic"),
  lightBlendMode: "multiply",
  darkBlendMode: "normal",
  darkOpacity: 0.5,
};

const BLEND_MODES: BlendMode[] = ["multiply", "normal", "screen", "darken", "lighten"];

/** Validiert geladene Einstellungen (z. B. aus data.json) und ergänzt Standardwerte. */
export function sanitizeSettings(raw: unknown): RealHighlightsSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<RealHighlightsSettings> & { enabled?: unknown };
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const num = (v: unknown, d: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : d;
  const blend = (v: unknown, d: BlendMode) => (BLEND_MODES.includes(v as BlendMode) ? (v as BlendMode) : d);
  const preset = MARKER_PRESETS.some((p) => p.id === s.preset) ? (s.preset as PresetId) : DEFAULT_SETTINGS.preset;
  const presetDefaults = presetSettingValues(preset);
  return {
    // Migration: Der frühere globale Schalter "enabled: false" schaltete beide Modi ab.
    readingMode: s.enabled === false ? false : bool(s.readingMode, DEFAULT_SETTINGS.readingMode),
    livePreview: s.enabled === false ? false : bool(s.livePreview, DEFAULT_SETTINGS.livePreview),
    preset,
    color: normalizeColor(s.color, DEFAULT_SETTINGS.color),
    palette: sanitizePalette(s.palette),
    opacity: num(s.opacity, presetDefaults.opacity, 0, 1),
    strokeHeight: num(s.strokeHeight, presetDefaults.strokeHeight, 0.3, 1.6),
    roughness: num(s.roughness, presetDefaults.roughness, 0, 1),
    fiberIntensity: num(s.fiberIntensity, presetDefaults.fiberIntensity, 0, 1),
    inkIntensity: num(s.inkIntensity, 1, 0, 2),
    lightBlendMode: blend(s.lightBlendMode, DEFAULT_SETTINGS.lightBlendMode),
    darkBlendMode: blend(s.darkBlendMode, DEFAULT_SETTINGS.darkBlendMode),
    darkOpacity: num(s.darkOpacity, DEFAULT_SETTINGS.darkOpacity, 0.1, 1),
  };
}

function sanitizePalette(raw: unknown): Record<HighlightColor, string> {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<HighlightColor, unknown>>;
  const out = { ...DEFAULT_PALETTE };
  for (const c of HIGHLIGHT_COLORS) out[c] = normalizeColor(p[c], DEFAULT_PALETTE[c]);
  return out;
}

/**
 * Vollständige Engine-Konfiguration für das aktuelle Theme.
 * @param highlightColor Obsidian-Highlight-Farbe der Markierung (null = Standardfarbe).
 */
export function settingsToConfig(
  s: RealHighlightsSettings,
  theme: Theme,
  highlightColor: HighlightColor | null = null,
): MarkerConfig {
  const color = highlightColor ? s.palette[highlightColor] : s.color;
  const base = presetConfig(s.preset, color);
  const cfg: MarkerConfig = {
    ...base,
    opacity: s.opacity,
    strokeHeight: s.strokeHeight,
    roughness: s.roughness,
    fiberIntensity: s.fiberIntensity,
    startInk: clamp(base.startInk * s.inkIntensity, 0, 1),
    endInk: clamp(base.endInk * s.inkIntensity, 0, 1),
    blendMode: s.lightBlendMode,
  };
  return adaptConfigForTheme(cfg, theme, { darkOpacityFactor: s.darkOpacity, darkBlendMode: s.darkBlendMode });
}

/** Zeichnet Real Highlights in mindestens einem Modus? */
export function anyModeActive(s: RealHighlightsSettings): boolean {
  return s.readingMode || s.livePreview;
}

/**
 * Befehl "Realistische Markierungen ein-/ausschalten": Ist mindestens ein Modus
 * aktiv, werden beide abgeschaltet, sonst beide eingeschaltet.
 */
export function toggleAllModes(s: RealHighlightsSettings): Pick<RealHighlightsSettings, "readingMode" | "livePreview"> {
  const on = !anyModeActive(s);
  return { readingMode: on, livePreview: on };
}

/** Aktuelles Obsidian-Theme anhand der Body-Klasse. */
export function currentTheme(doc: Document = activeDocument): Theme {
  return doc.body.classList.contains("theme-dark") ? "dark" : "light";
}
