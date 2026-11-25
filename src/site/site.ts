/**
 * Landingpage: Alle Bereiche mit der Klasse "marked" werden live mit der
 * Real-Highlights-Engine gezeichnet (dieselbe Engine wie im Plugin).
 */
import type { MarkerConfig, PresetId, Theme } from "../engine";
import { MARKER_PRESETS, adaptConfigForTheme, presetConfig } from "../engine";
import { DEFAULT_PALETTE, isHighlightColor } from "../obsidian/core/highlightColors";
import type { HighlightColor } from "../obsidian/core/highlightColors";
import { MarkerOverlay } from "../playground/components/MarkerOverlay";
import { RenderCache } from "../shared/RenderCache";

const cache = new RenderCache(600);
const overlays: MarkerOverlay[] = [];

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const THEME_KEY = "real-highlights.site.theme";
function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
let theme: Theme = initialTheme();
function applyTheme(): void {
  document.documentElement.dataset.theme = theme;
}
applyTheme();

document.getElementById("theme-toggle")!.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  refresh();
});

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

function markColor(mark: HTMLElement): HighlightColor | null {
  const c = mark.dataset.color;
  return isHighlightColor(c) ? c : null;
}

function configFor(preset: PresetId, color: HighlightColor | null): MarkerConfig {
  const cfg = presetConfig(preset, DEFAULT_PALETTE[color ?? "yellow"]);
  return adaptConfigForTheme(cfg, theme);
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

/**
 * Verwandelt ein Element in einen Bezugscontainer: Der Inhalt wandert in einen
 * inneren Block (über der Marker-Ebene), die Ebene kommt davor.
 */
function attach(
  el: HTMLElement,
  options: { preset?: () => PresetId; color?: () => HighlightColor | null; mode?: () => "realistic" | "classic" } = {},
): MarkerOverlay {
  const content = document.createElement(el.tagName === "P" || /^H\d$/.test(el.tagName) ? "span" : "div");
  content.className = "rm-content";
  while (el.firstChild) content.appendChild(el.firstChild);
  el.appendChild(content);
  const overlay = new MarkerOverlay(
    el,
    content,
    cache,
    (mark) => ({ config: configFor(options.preset?.() ?? "classic", options.color?.() ?? markColor(mark)) }),
    () => ({ layers: {}, debug: false, mode: options.mode?.() ?? "realistic" }),
  );
  overlays.push(overlay);
  return overlay;
}

function refresh(): void {
  for (const o of overlays) o.schedule();
}

// Hero mit Vergleichsschalter
let heroMode: "realistic" | "classic" = "realistic";
const heroNote = document.getElementById("hero-note")!;
const compare = document.getElementById("compare")!;
compare.addEventListener("click", (e) => {
  const mode = (e.target as HTMLElement).dataset.mode;
  if (mode !== "realistic" && mode !== "classic") return;
  heroMode = mode;
  compare.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  refresh();
});

// Presets
const PRESET_TEXT: Record<PresetId, string> = {
  classic: "The reference: an even, vivid fluorescent stroke with subtle fibers.",
  pastel: "Softer and lighter, for a calm page.",
  dry: "A pen that's running dry: visible fibers and patchy ink.",
  quick: "Drawn in a hurry: more wobble and uneven ink.",
  heavy: "Saturated color with ink pooling at both ends.",
};
const presetsEl = document.getElementById("presets")!;
for (const p of MARKER_PRESETS) {
  const row = document.createElement("div");
  row.className = "preset";
  const name = document.createElement("h3");
  name.textContent = p.name;
  const text = document.createElement("p");
  text.className = "marked";
  const mark = document.createElement("mark");
  mark.textContent = PRESET_TEXT[p.id];
  text.appendChild(mark);
  row.append(name, text);
  presetsEl.appendChild(row);
}

// Ausprobieren
const tryText = document.getElementById("try-text") as HTMLTextAreaElement;
const tryPreset = document.getElementById("try-preset") as HTMLSelectElement;
const tryColor = document.getElementById("try-color") as HTMLSelectElement;
const tryOutput = document.getElementById("try-output")!;
tryPreset.innerHTML = MARKER_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
const COLOR_NAMES: Record<HighlightColor, string> = {
  yellow: "🟡 Yellow",
  red: "🔴 Red",
  orange: "🟠 Orange",
  green: "🟢 Green",
  blue: "🔵 Blue",
  purple: "🟣 Purple",
};
tryColor.innerHTML = (Object.keys(COLOR_NAMES) as HighlightColor[])
  .map((c) => `<option value="${c}">${COLOR_NAMES[c]}</option>`)
  .join("");
const tryMark = tryOutput.querySelector("mark")!;
const syncTry = () => {
  tryMark.textContent = tryText.value.trim() || " ";
};
syncTry();
tryText.addEventListener("input", syncTry);

// Alle markierten Bereiche anbinden
for (const el of Array.from(document.querySelectorAll<HTMLElement>(".marked"))) {
  if (el === heroNote) attach(el, { mode: () => heroMode });
  else if (el === tryOutput)
    attach(el, {
      preset: () => tryPreset.value as PresetId,
      color: () => tryColor.value as HighlightColor,
    });
  else if (el.closest(".preset")) {
    const id = MARKER_PRESETS[Array.from(presetsEl.children).indexOf(el.closest(".preset")!)].id;
    attach(el, { preset: () => id });
  } else attach(el);
}
tryPreset.addEventListener("change", refresh);
tryColor.addEventListener("change", refresh);
document.fonts?.ready.then(refresh);
