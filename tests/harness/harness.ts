/**
 * Testaufbau für die Obsidian-Integration ohne Obsidian:
 * - Live Preview: echtes CodeMirror 6 mit derselben Layer-Erweiterung wie im Plugin.
 *   Ein kleines ViewPlugin bildet Obsidians Darstellung nach (cm-highlight,
 *   cm-formatting-highlight, == ausgeblendet außer bei Cursor in der Markierung).
 * - Reading Mode: dieselbe renderMarks-Logik wie MarkerSection.
 */
import "../setup/obsidianDom";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import "../../styles.css";
import { RenderCache } from "../../src/shared/RenderCache";
import { renderMarks } from "../../src/obsidian/core/markLayer";
import { DEFAULT_SETTINGS, currentTheme, settingsToConfig } from "../../src/obsidian/core/pluginConfig";
import { leadingColorEmoji, markColor } from "../../src/obsidian/core/highlightColors";
import { livePreviewExtension, refreshMarkersEffect } from "../../src/obsidian/integrations/LivePreview";

const cache = new RenderCache(500);
let enabled = true;
const config = (color: Parameters<typeof settingsToConfig>[2] = null) =>
  enabled ? settingsToConfig(DEFAULT_SETTINGS, currentTheme(), color) : null;

const hlDeco = (color: string | null) =>
  Decoration.mark({ class: color ? `cm-highlight cm-highlight-${color}` : "cm-highlight" });
const fmt = Decoration.mark({ class: "cm-formatting cm-formatting-highlight cm-highlight" });
const hidden = Decoration.replace({});

function decorate(view: EditorView): DecorationSet {
  const b = new RangeSetBuilder<Decoration>();
  const sel = view.state.selection.main;
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    for (const m of text.matchAll(/==([^=\n]+?)==/g)) {
      const s = from + m.index!;
      const e = s + m[0].length;
      const active = sel.from <= e && sel.to >= s;
      // Wie Obsidian 1.15.1: Farb-Emoji gehört zum Markierungsbeginn und wird ausgeblendet.
      const lead = leadingColorEmoji(m[1]);
      const open = 2 + (lead ? lead.emoji.length : 0);
      b.add(s, s + open, active ? fmt : hidden);
      b.add(s + open, e - 2, hlDeco(lead?.color ?? null));
      b.add(e - 2, e, active ? fmt : hidden);
    }
  }
  return b.finish();
}

const obsidianLike = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorate(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet) this.decorations = decorate(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

const DOC = `# Live Preview

Ein physischer Textmarker hinterlässt ==keine perfekte Fläche==. Die ==Kanten sind leicht unregelmäßig== und die Enden schräg.

Kurz: ==Tinte== und ==Papier==.

Farben: ==🔴Rot== ==🟠Orange== ==🟡Gelb== ==🟢Grün== ==🔵Blau== ==🟣Lila== und ==Standard==.

==Eine lange Markierung, die im Editor über mehrere visuelle Zeilen umbricht, bekommt pro Zeile einen eigenen Strich – genau wie im Reading Mode.==

Normaler Text ohne Markierung.
${Array.from({ length: 40 }, (_, i) => `\nZeile ${i + 1} mit ==Markierung ${i + 1}== zum Scrollen.`).join("")}
`;

const view = new EditorView({
  parent: document.getElementById("editor")!,
  state: EditorState.create({
    doc: DOC,
    extensions: [
      EditorView.lineWrapping,
      obsidianLike,
      livePreviewExtension({ cache, config: (_v, color) => config(color) }),
    ],
  }),
});

const reading = document.getElementById("reading")!;
reading.innerHTML = `
<p>Ein physischer Textmarker hinterlässt <mark>keine perfekte Fläche</mark>. Die <mark>Kanten sind leicht unregelmäßig</mark> und die Enden schräg.</p>
<p>Kurz: <mark>Tinte</mark> und <mark>Papier</mark>.</p>
<p>Farben: <mark data-highlight="red">Rot</mark> <mark data-highlight="orange">Orange</mark> <mark data-highlight="yellow">Gelb</mark> <mark data-highlight="green">Grün</mark> <mark data-highlight="blue">Blau</mark> <mark data-highlight="purple">Lila</mark> und <mark>Standard</mark>.</p>
<p><mark>Eine lange Markierung, die im Editor über mehrere visuelle Zeilen umbricht, bekommt pro Zeile einen eigenen Strich – genau wie im Reading Mode.</mark></p>
<div class="callout"><div class="callout-title">Callout</div><div class="callout-content"><p>Markierung <mark>im Callout mit Hintergrund</mark>.</p></div></div>
<table><tr><td><mark>Tabellenzelle</mark></td><td>normal</td></tr></table>
<p>Formatiert: <mark><strong>fett</strong> und <em>kursiv</em></mark>.</p>`;

function renderReading() {
  const cfg = config();
  const marks = cfg ? Array.from(reading.querySelectorAll<HTMLElement>("mark")) : [];
  renderMarks(reading, marks, {
    cache,
    config: (m) => config(markColor(m)) ?? settingsToConfig(DEFAULT_SETTINGS, "light"),
    idPrefix: "rmh",
  });
}
new ResizeObserver(() => requestAnimationFrame(renderReading)).observe(reading);

function refresh() {
  document.body.classList.toggle("real-highlights-live", enabled);
  document.body.classList.toggle("real-highlights-reading", enabled);
  view.dispatch({ effects: refreshMarkersEffect.of(null) });
  renderReading();
}
document.getElementById("dark")!.addEventListener("change", (e) => {
  document.body.classList.toggle("theme-dark", (e.target as HTMLInputElement).checked);
  refresh();
});
document.getElementById("enabled")!.addEventListener("change", (e) => {
  enabled = (e.target as HTMLInputElement).checked;
  refresh();
});

Object.assign(window, { harness: { view, cache, renderReading } });
