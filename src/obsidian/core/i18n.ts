/**
 * Übersetzungen der Plugin-Oberfläche (Englisch als Standard, Deutsch).
 * Die Sprache folgt der Obsidian-Sprache; ohne passende Übersetzung gilt Englisch.
 */
import type { HighlightColor } from "./highlightColors";

export type Language = "en" | "de";

const en = {
  "command.toggleHighlight": "Toggle highlight",
  "command.toggleModes": "Toggle realistic highlights",

  "preview.text":
    "A physical highlighter never leaves a perfect rectangle. <mark>The edges are slightly irregular</mark>, " +
    "the ends are slanted, and <mark>where the pen touches down, a little more ink collects</mark>.",

  "setting.preview.name": "Preview",
  "setting.readingMode.name": "Reading view",
  "setting.readingMode.desc": "Show realistic strokes instead of the regular highlight while reading.",
  "setting.livePreview.name": "Live Preview",
  "setting.livePreview.desc": "Show realistic strokes while editing. Source mode stays unchanged.",

  "heading.marker": "Highlighter",
  "setting.preset.name": "Preset",
  "setting.preset.desc": "Resets opacity, stroke height, edges, fibers and ink to the preset's values.",
  "setting.color.name": "Default color",
  "setting.color.desc": "For ==highlights== without a color.",
  "setting.color.custom": "Custom color",
  "setting.customColor.name": "Color",
  "setting.opacity.name": "Opacity",
  "setting.strokeHeight.name": "Stroke height",
  "setting.strokeHeight.desc": "Relative to the line height.",
  "setting.roughness.name": "Edge roughness",
  "setting.fiberIntensity.name": "Fiber texture",
  "setting.inkIntensity.name": "Ink intensity",
  "setting.inkIntensity.desc": "Extra ink where the stroke starts and ends.",

  "heading.colors": "Highlight colors",
  "heading.colors.desc": "Pen colors for Obsidian's colored highlights: ==🔴text==, ==🟠text==, ==🟡text==, ==🟢text==, ==🔵text==, ==🟣text==.",
  "setting.colors.reset": "Restore default colors",
  "setting.colors.syntax.name": "Syntax",

  "heading.light": "Light mode",
  "setting.lightBlend.name": "Blend mode",
  "setting.lightBlend.desc": "Multiply behaves like ink on paper.",
  "heading.dark": "Dark mode",
  "setting.darkBlend.name": "Blend mode",
  "setting.darkBlend.desc": "On a dark background, multiply would make the color almost disappear.",
  "setting.darkOpacity.name": "Opacity factor",
  "setting.darkOpacity.desc": "Multiplies the opacity in dark mode.",

  "setting.reset.name": "Reset settings",
  "setting.reset.desc": "Restores all settings to their defaults.",
  "button.reset": "Reset",

  "support.text": "Enjoying Real Highlights?",
  "support.link": "Buy me a coffee",
};

export type MessageKey = keyof typeof en;

const de: Record<MessageKey, string> = {
  "command.toggleHighlight": "Markierung umschalten",
  "command.toggleModes": "Realistische Markierungen ein-/ausschalten",

  "preview.text":
    "Ein physischer Textmarker hinterlässt keine perfekte Fläche. <mark>Die Kanten sind leicht unregelmäßig</mark>, " +
    "die Enden schräg, und <mark>dort, wo der Marker ansetzt, sammelt sich etwas mehr Tinte</mark>.",

  "setting.preview.name": "Vorschau",
  "setting.readingMode.name": "Leseansicht",
  "setting.readingMode.desc": "Realistische Striche statt der normalen Markierung beim Lesen.",
  "setting.livePreview.name": "Live Preview",
  "setting.livePreview.desc": "Realistische Striche beim Bearbeiten. Der Source Mode bleibt unverändert.",

  "heading.marker": "Textmarker",
  "setting.preset.name": "Preset",
  "setting.preset.desc": "Setzt Deckkraft, Strichhöhe, Kanten, Fasern und Tinte auf die Werte des Presets.",
  "setting.color.name": "Standardfarbe",
  "setting.color.desc": "Für ==Markierungen== ohne Farbangabe.",
  "setting.color.custom": "Eigene Farbe",
  "setting.customColor.name": "Farbe",
  "setting.opacity.name": "Deckkraft",
  "setting.strokeHeight.name": "Strichhöhe",
  "setting.strokeHeight.desc": "Relativ zur Zeilenhöhe.",
  "setting.roughness.name": "Kantenunregelmäßigkeit",
  "setting.fiberIntensity.name": "Faserstruktur",
  "setting.inkIntensity.name": "Tintenintensität",
  "setting.inkIntensity.desc": "Tintenansammlung am Anfang und Ende des Strichs.",

  "heading.colors": "Farbige Markierungen",
  "heading.colors.desc": "Markerfarben für die farbigen Obsidian-Markierungen: ==🔴Text==, ==🟠Text==, ==🟡Text==, ==🟢Text==, ==🔵Text==, ==🟣Text==.",
  "setting.colors.reset": "Standardfarben wiederherstellen",
  "setting.colors.syntax.name": "Syntax",

  "heading.light": "Light Mode",
  "setting.lightBlend.name": "Mischmodus",
  "setting.lightBlend.desc": "Multiply verhält sich wie Tinte auf Papier.",
  "heading.dark": "Dark Mode",
  "setting.darkBlend.name": "Mischmodus",
  "setting.darkBlend.desc": "Auf dunklem Hintergrund würde Multiply die Farbe nahezu auslöschen.",
  "setting.darkOpacity.name": "Deckkraftfaktor",
  "setting.darkOpacity.desc": "Multipliziert die Deckkraft im Dark Mode.",

  "setting.reset.name": "Einstellungen zurücksetzen",
  "setting.reset.desc": "Setzt alle Einstellungen auf die Standardwerte zurück.",
  "button.reset": "Zurücksetzen",

  "support.text": "Gefällt dir Real Highlights?",
  "support.link": "Spendier mir einen Kaffee",
};

const HIGHLIGHT_COLOR_NAMES: Record<Language, Record<HighlightColor, string>> = {
  en: { red: "Red", orange: "Orange", yellow: "Yellow", green: "Green", blue: "Blue", purple: "Purple" },
  de: { red: "Rot", orange: "Orange", yellow: "Gelb", green: "Grün", blue: "Blau", purple: "Lila" },
};

/** Namen der Standardfarben-Vorgaben (Engine-Palette, nach ID). */
const PEN_COLOR_NAMES: Record<Language, Record<string, string>> = {
  en: { yellow: "Yellow", pink: "Pink", green: "Green", orange: "Orange", blue: "Blue", violet: "Violet" },
  de: { yellow: "Gelb", pink: "Pink", green: "Grün", orange: "Orange", blue: "Blau", violet: "Violett" },
};

const MESSAGES: Record<Language, Record<MessageKey, string>> = { en, de };

/** Ordnet einen Obsidian-Sprachcode (z. B. "de", "en-GB", "zh-TW") einer unterstützten Sprache zu. */
export function resolveLanguage(code: string | null | undefined): Language {
  return typeof code === "string" && code.toLowerCase().startsWith("de") ? "de" : "en";
}

export interface Translator {
  lang: Language;
  t(key: MessageKey): string;
  highlightColor(color: HighlightColor): string;
  penColor(id: string, fallback: string): string;
}

export function createTranslator(lang: Language): Translator {
  return {
    lang,
    t: (key) => MESSAGES[lang][key] ?? en[key],
    highlightColor: (color) => HIGHLIGHT_COLOR_NAMES[lang][color],
    penColor: (id, fallback) => PEN_COLOR_NAMES[lang][id] ?? fallback,
  };
}
