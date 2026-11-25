import type { BlendMode, MarkerConfig, MarkerLayers, PresetId, Theme } from "../engine";
import {
  ALGORITHM_VERSION,
  DEFAULT_LAYERS,
  MARKER_COLORS,
  MARKER_PRESETS,
  PARAM_SPECS,
  adaptConfigForTheme,
  fnv1a,
  normalizeColor,
  normalizeConfig,
  presetConfig,
  textSeed,
} from "../engine";
import { RenderCache } from "../shared/RenderCache";
import { MarkerOverlay, type OverlaySettings, type RenderReport } from "./components/MarkerOverlay";
import { markSelection, sanitizeEditorHtml, unmarkSelection } from "./components/editorUtils";

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

type FontId = "system" | "serif" | "mono" | "rounded";
type Mode = "realistic" | "classic";

interface PlaygroundState {
  presetId: PresetId;
  config: MarkerConfig;
  blend: "auto" | BlendMode;
  seedOverride: number | null;
  layers: MarkerLayers;
  debug: boolean;
  font: FontId;
  fontSize: number;
  width: number;
  theme: Theme;
  mode: Mode;
  editorHtml: string;
}

const STORAGE_KEY = "realmarker.playground.v1";

const FONTS: Record<FontId, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  rounded: 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif',
};

const DEFAULT_EDITOR_HTML =
  `<p>Ein physischer Textmarker hinterlässt keine perfekte Fläche. <mark>Die Kanten sind leicht unregelmäßig</mark>, ` +
  `die Enden schräg, und dort, wo der Marker ansetzt, sammelt sich etwas mehr Tinte.</p>` +
  `<p>Kurze Wörter wie <mark>Tinte</mark> oder <mark>Papier</mark> erhalten kurze Striche. ` +
  `<mark>Lange Passagen, die sich über mehrere Zeilen erstrecken, bekommen für jede sichtbare Zeile einen eigenen, ` +
  `leicht unterschiedlichen Markerstrich – genau wie beim Markieren auf Papier.</mark> ` +
  `Auch <mark><b>fett</b> und <i>kursiv</i> formatierter Text</mark> wird pro Zeile zusammengeführt.</p>`;

function defaultState(): PlaygroundState {
  return {
    presetId: "classic",
    config: presetConfig("classic"),
    blend: "auto",
    seedOverride: null,
    layers: { ...DEFAULT_LAYERS },
    debug: false,
    font: "system",
    fontSize: 19,
    width: 640,
    theme: "light",
    mode: "realistic",
    editorHtml: DEFAULT_EDITOR_HTML,
  };
}

function loadState(): PlaygroundState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<PlaygroundState>;
    return {
      ...base,
      ...s,
      config: normalizeConfig(s.config ?? base.config),
      layers: { ...DEFAULT_LAYERS, ...(s.layers ?? {}) },
      seedOverride: typeof s.seedOverride === "number" && Number.isFinite(s.seedOverride) ? s.seedOverride >>> 0 : null,
      editorHtml: sanitizeEditorHtml(s.editorHtml ?? base.editorHtml),
    };
  } catch {
    return base;
  }
}

let state = loadState();
let saveTimer = 0;
function save(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    state.editorHtml = editor.innerHTML;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 250);
}

/** Effektive Konfiguration nach Theme-Anpassung und Blend-Override. */
function effectiveConfig(base: MarkerConfig = state.config): MarkerConfig {
  const adapted = adaptConfigForTheme(base, state.theme);
  return state.blend === "auto" ? adapted : { ...adapted, blendMode: state.blend };
}

// ---------------------------------------------------------------------------
// DOM-Helfer
// ---------------------------------------------------------------------------

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const editorRoot = $("editor-root");
const editor = $("editor");

function toast(msg: string): void {
  let el = document.querySelector<HTMLDivElement>(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el!.classList.remove("show"), 1600);
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

const cache = new RenderCache(800);
const overlays: MarkerOverlay[] = [];

const overlaySettings = (mode?: Mode) => (): OverlaySettings => ({
  layers: state.layers,
  debug: state.debug,
  mode: mode ?? state.mode,
});

function addOverlay(
  root: HTMLElement,
  resolve: (m: HTMLElement) => { config: MarkerConfig; seed?: number },
  mode?: Mode,
): MarkerOverlay {
  const content = root.querySelector<HTMLElement>(".text")!;
  const o = new MarkerOverlay(root, content, cache, resolve, overlaySettings(mode));
  overlays.push(o);
  return o;
}

// Hauptvorschau
editor.innerHTML = state.editorHtml;
const mainOverlay = addOverlay(editorRoot, () => ({
  config: effectiveConfig(),
  seed: state.seedOverride ?? undefined,
}));

// Klassisch vs. realistisch
const COMPARE_HTML =
  `Wer liest, markiert: <mark>Die wichtigsten Gedanken eines Textes</mark> stechen hervor, ` +
  `ohne dass <mark>die Lesbarkeit leidet</mark>.`;
for (const id of ["cmp-classic", "cmp-real"]) {
  $(id).querySelector(".text")!.innerHTML = COMPARE_HTML;
}
addOverlay($("cmp-classic"), () => ({ config: effectiveConfig() }), "classic");
addOverlay($("cmp-real"), () => ({ config: effectiveConfig() }), "realistic");

// Presets
const presetRows = $("preset-rows");
const PRESET_TEXT = `Physische Textmarker erzeugen <mark>organische, lebendige Markierungen</mark> auf Papier.`;
for (const p of MARKER_PRESETS) {
  const row = document.createElement("div");
  row.className = "preset-row";
  row.innerHTML = `<div><div class="name">${p.name}</div><div class="desc">${p.description}</div></div>
    <div class="paper" data-preset="${p.id}"><div class="text">${PRESET_TEXT}</div></div>`;
  presetRows.appendChild(row);
  addOverlay(row.querySelector<HTMLElement>(".paper")!, () => ({
    config: effectiveConfig(presetConfig(p.id, state.config.color)),
  }));
}

// Farben
$("colors-root").querySelector(".text")!.innerHTML = MARKER_COLORS.map(
  (c) => `<mark data-color="${c.hex}" style="--mark-color:${c.hex}">${c.name} markiert</mark>`,
).join(" · ");
addOverlay($("colors-root"), (m) => ({
  config: effectiveConfig({ ...state.config, color: m.dataset.color ?? state.config.color }),
}));

// Längen
$("lengths-root").querySelector(".text")!.innerHTML =
  `<p>Einzelne Zeichen: <mark>a</mark> <mark>§</mark> <mark>😀</mark> · kurz: <mark>Wort</mark> · ` +
  `mittel: <mark>eine mittellange Passage</mark></p>` +
  `<p><mark>Dieser sehr lange Absatz wird vollständig markiert. Er erstreckt sich über mehrere Zeilen, damit sichtbar wird, ` +
  `wie sich die einzelnen Striche voneinander unterscheiden, obwohl sie aus derselben Textpassage abgeleitet werden. ` +
  `Jede Zeile erhält einen eigenen Seed, Anfang und Ende sind individuell, und kein Strich ist ein gestreckter kurzer Strich.</mark></p>`;
addOverlay($("lengths-root"), () => ({ config: effectiveConfig() }));

function renderAll(): void {
  for (const o of overlays) o.schedule();
}

// ---------------------------------------------------------------------------
// Statistik & Seed-Anzeige
// ---------------------------------------------------------------------------

function activeMark(): HTMLElement | null {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  const el = node instanceof Element ? node : node?.parentElement;
  const m = el?.closest("mark");
  if (m && editor.contains(m)) return m as HTMLElement;
  return editor.querySelector("mark");
}

function updateSeedInfo(): void {
  const m = activeMark();
  const auto = m ? textSeed(m.textContent ?? "") : null;
  $("auto-seed").textContent = auto === null ? "–" : String(auto);
  $("effective-seed").textContent = state.seedOverride !== null ? `${state.seedOverride} (Override)` : (auto?.toString() ?? "–");
  ($("seed-override") as HTMLInputElement).value = state.seedOverride?.toString() ?? "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function updateStats(report: RenderReport): void {
  const total = overlays.reduce((sum, o) => sum + o.last.ms, 0);
  const lines = overlays.reduce((sum, o) => sum + o.last.lineCount, 0);
  $("stats").textContent =
    `Vorschau: ${report.lineCount} Striche · ${report.ms.toFixed(1)} ms   ` +
    `Gesamt: ${lines} Striche · ${total.toFixed(1)} ms   Cache ${cache.cache.size}`;
  $("marks-table").innerHTML =
    `<tr><td>Markierung</td><td>Länge</td><td>Basis-Seed</td><td>Zeilen</td><td>Zeilen-Seeds</td></tr>` +
    report.marks
      .map(
        (m) =>
          `<tr><td>${escapeHtml(m.text)}</td><td>${m.text.length}</td><td><code>${m.baseSeed}</code></td>` +
          `<td>${m.lines.length}</td><td><code>${m.lines.map((l) => l.seed).join(", ")}</code></td></tr>`,
      )
      .join("");
  updateSeedInfo();
}
mainOverlay.onRender = updateStats;

// ---------------------------------------------------------------------------
// Steuerelemente
// ---------------------------------------------------------------------------

const presetSelect = $<HTMLSelectElement>("preset");
presetSelect.innerHTML = MARKER_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
presetSelect.addEventListener("change", () => {
  state.presetId = presetSelect.value as PresetId;
  state.config = { ...presetConfig(state.presetId, state.config.color), blendMode: state.config.blendMode };
  syncControls();
  changed();
});

const swatches = $("swatches");
swatches.innerHTML = MARKER_COLORS.map(
  (c) => `<button class="swatch" title="${c.name}" data-hex="${c.hex}" style="background:${c.hex}"></button>`,
).join("");
swatches.addEventListener("click", (e) => {
  const hex = (e.target as HTMLElement).dataset.hex;
  if (!hex) return;
  state.config.color = hex;
  syncControls();
  changed();
});
const colorInput = $<HTMLInputElement>("color");
colorInput.addEventListener("input", () => {
  state.config.color = normalizeColor(colorInput.value);
  syncControls();
  changed();
});

const blendSelect = $<HTMLSelectElement>("blend");
blendSelect.addEventListener("change", () => {
  state.blend = blendSelect.value as PlaygroundState["blend"];
  changed();
});

// Parameter-Slider aus den Engine-Spezifikationen erzeugen
const params = $("params");
const sliderRefs = new Map<string, { input: HTMLInputElement; out: HTMLOutputElement }>();
for (const spec of PARAM_SPECS) {
  const wrap = document.createElement("div");
  wrap.className = "param";
  wrap.title = spec.description;
  wrap.innerHTML = `<label for="p-${spec.key}">${spec.label}</label><output></output>
    <input type="range" id="p-${spec.key}" min="${spec.min}" max="${spec.max}" step="${spec.step}" />`;
  const input = wrap.querySelector("input")!;
  const out = wrap.querySelector("output")!;
  input.addEventListener("input", () => {
    (state.config[spec.key] as number) = Number(input.value);
    out.textContent = formatParam(Number(input.value), spec.unit);
    changed();
  });
  params.appendChild(wrap);
  sliderRefs.set(spec.key, { input, out });
}
function formatParam(v: number, unit?: string): string {
  return unit ? `${v}${unit}` : v.toFixed(2);
}

// Ebenen
const layerLabels: Record<keyof MarkerLayers, string> = {
  base: "Grundfläche",
  pooling: "Tintenansammlung",
  edges: "Ränder",
  fibers: "Fasern",
  grain: "Körnung",
};
const layersEl = $("layers");
for (const key of Object.keys(layerLabels) as (keyof MarkerLayers)[]) {
  const label = document.createElement("label");
  label.className = "check";
  label.innerHTML = `<input type="checkbox" data-layer="${key}" /> ${layerLabels[key]}`;
  label.querySelector("input")!.addEventListener("change", (e) => {
    state.layers[key] = (e.target as HTMLInputElement).checked;
    changed();
  });
  layersEl.appendChild(label);
}
$<HTMLInputElement>("debug").addEventListener("change", (e) => {
  state.debug = (e.target as HTMLInputElement).checked;
  changed();
});

// Seed
const seedInput = $<HTMLInputElement>("seed-override");
seedInput.addEventListener("change", () => {
  const v = seedInput.value.trim();
  const n = Number(v);
  state.seedOverride = v === "" || !Number.isFinite(n) ? null : Math.floor(Math.abs(n)) >>> 0;
  changed();
});
$("new-variant").addEventListener("click", () => {
  const m = activeMark();
  const current = state.seedOverride ?? (m ? textSeed(m.textContent ?? "") : 0);
  state.seedOverride = fnv1a(`${current}:variant`);
  changed();
});
$("clear-seed").addEventListener("click", () => {
  state.seedOverride = null;
  changed();
});

// Vorschau-Toolbar
const fontSelect = $<HTMLSelectElement>("font");
fontSelect.addEventListener("change", () => {
  state.font = fontSelect.value as FontId;
  applyLayoutVars();
  changed();
});
const fontSize = $<HTMLInputElement>("font-size");
fontSize.addEventListener("input", () => {
  state.fontSize = Number(fontSize.value);
  applyLayoutVars();
  save();
});
const widthInput = $<HTMLInputElement>("width");
widthInput.addEventListener("input", () => {
  state.width = Number(widthInput.value);
  applyLayoutVars();
  save();
});

function segmented<T extends string>(id: string, get: () => T, set: (v: T) => void): void {
  const el = $(id);
  el.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).dataset.value as T | undefined;
    if (!v) return;
    set(v);
    syncControls();
    changed();
  });
  syncers.push(() => {
    el.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.classList.toggle("active", b.dataset.value === get()));
  });
}
const syncers: (() => void)[] = [];
segmented<Mode>("mode", () => state.mode, (v) => (state.mode = v));
segmented<Theme>("theme", () => state.theme, (v) => (state.theme = v));

// Markieren / Entfernen
$("mark-btn").addEventListener("mousedown", (e) => e.preventDefault());
$("unmark-btn").addEventListener("mousedown", (e) => e.preventDefault());
$("mark-btn").addEventListener("click", () => {
  if (!markSelection(editor)) toast("Bitte zuerst Text in der Vorschau auswählen.");
  save();
});
$("unmark-btn").addEventListener("click", () => {
  if (!unmarkSelection(editor)) toast("Keine Markierung in der Auswahl.");
  save();
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
    e.preventDefault();
    markSelection(editor);
    save();
  }
});
editor.addEventListener("input", save);
document.addEventListener("selectionchange", updateSeedInfo);

// Export / Import
function configJson(): string {
  return JSON.stringify(
    {
      app: "RealMarker",
      algorithmVersion: ALGORITHM_VERSION,
      preset: state.presetId,
      seedOverride: state.seedOverride,
      blend: state.blend,
      config: state.config,
    },
    null,
    2,
  );
}
$("export-svg").addEventListener("click", () => {
  if (state.mode !== "realistic") return toast("SVG-Export nur im Modus „Realistisch“.");
  download("realmarker.svg", mainOverlay.exportSvg(), "image/svg+xml");
});
$("export-json").addEventListener("click", () => download("realmarker-config.json", configJson(), "application/json"));
$("copy-json").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(configJson());
    toast("Konfiguration kopiert.");
  } catch {
    toast("Zwischenablage nicht verfügbar.");
  }
});
const importFile = $<HTMLInputElement>("import-file");
$("import-json").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const cfg = data && typeof data === "object" && data.config ? data.config : data;
    state.config = normalizeConfig(cfg);
    if (MARKER_PRESETS.some((p) => p.id === data.preset)) state.presetId = data.preset;
    if (["auto", "multiply", "normal", "screen", "darken"].includes(data.blend)) state.blend = data.blend;
    state.seedOverride = typeof data.seedOverride === "number" ? data.seedOverride >>> 0 : null;
    if (data.algorithmVersion && data.algorithmVersion !== ALGORITHM_VERSION) {
      toast(`Hinweis: Konfiguration aus Algorithmusversion ${data.algorithmVersion}.`);
    } else {
      toast("Konfiguration importiert.");
    }
    syncControls();
    changed();
  } catch {
    toast("Ungültige JSON-Datei.");
  }
});
$("reset").addEventListener("click", () => {
  const html = editor.innerHTML;
  state = { ...defaultState(), editorHtml: html, theme: state.theme, font: state.font, fontSize: state.fontSize, width: state.width };
  syncControls();
  changed();
});

// ---------------------------------------------------------------------------
// Synchronisation
// ---------------------------------------------------------------------------

function applyLayoutVars(): void {
  const root = document.documentElement.style;
  root.setProperty("--font-size", `${state.fontSize}px`);
  root.setProperty("--text-width", `${state.width}px`);
  root.setProperty("--font-family", FONTS[state.font]);
  root.setProperty("--mark-color", state.config.color);
  $("font-size-out").textContent = `${state.fontSize}px`;
  $("width-out").textContent = `${state.width}px`;
}

function syncControls(): void {
  presetSelect.value = state.presetId;
  colorInput.value = state.config.color;
  blendSelect.value = state.blend;
  swatches.querySelectorAll<HTMLElement>(".swatch").forEach((s) =>
    s.classList.toggle("active", s.dataset.hex === state.config.color),
  );
  for (const spec of PARAM_SPECS) {
    const ref = sliderRefs.get(spec.key)!;
    const v = state.config[spec.key] as number;
    ref.input.value = String(v);
    ref.out.textContent = formatParam(v, spec.unit);
  }
  layersEl.querySelectorAll<HTMLInputElement>("input[data-layer]").forEach((i) => {
    i.checked = state.layers[i.dataset.layer as keyof MarkerLayers];
  });
  $<HTMLInputElement>("debug").checked = state.debug;
  fontSelect.value = state.font;
  fontSize.value = String(state.fontSize);
  widthInput.value = String(state.width);
  document.body.classList.toggle("dark", state.theme === "dark");
  syncers.forEach((s) => s());
  applyLayoutVars();
}

function changed(): void {
  state.config = normalizeConfig(state.config);
  applyLayoutVars();
  renderAll();
  updateSeedInfo();
  save();
}

$("version").textContent = `Engine ${ALGORITHM_VERSION}`;
syncControls();
renderAll();

// Für Debugging/Tests in der Browser-Konsole.
Object.assign(window, { realmarker: { state: () => state, overlays, cache } });
