/**
 * Live-Preview-Integration über einen CodeMirror-6-Layer.
 *
 * Layer sind die von CodeMirror vorgesehene Technik, um Grafik hinter dem Text
 * zu zeichnen (wie die Textauswahl). Vorteile:
 * - kein Eingriff in das Dokument-DOM, keine Decorations → Cursor, Auswahl
 *   und Zeilenhöhen bleiben unverändert;
 * - Messen und Zeichnen laufen im Mess-/Schreibzyklus von CodeMirror
 *   (gebündelt, kein eigener Rendering-Loop);
 * - nur sichtbare (gerenderte) Zeilen werden verarbeitet.
 *
 * Diese Datei importiert bewusst nichts aus "obsidian", damit sie in einem
 * eigenständigen CodeMirror-Testaufbau geprüft werden kann.
 */
import { StateEffect } from "@codemirror/state";
import type { EditorView, LayerMarker, ViewUpdate } from "@codemirror/view";
import { layer } from "@codemirror/view";
import type { MarkerConfig } from "../../engine";
import type { RenderCache } from "../../shared/RenderCache";
import { mergeLineRects } from "../../shared/TextMeasurement";
import type { HighlightColor } from "../core/highlightColors";
import { setMarkup } from "../core/markup";
import { collectHighlightRuns, rangeForRun } from "./highlightDom";

export interface LivePreviewContext {
  cache: RenderCache;
  /**
   * Konfiguration für eine Markierung der angegebenen Highlight-Farbe (null =
   * Standardfarbe) oder null, wenn für diese Ansicht nichts gezeichnet werden soll.
   */
  config(view: EditorView, color: HighlightColor | null): MarkerConfig | null;
}

/** Erzwingt ein Neuzeichnen (z. B. nach Änderung der Einstellungen oder des Themes). */
export const refreshMarkersEffect = StateEffect.define<null>();

let viewCounter = 0;
const viewIds = new WeakMap<EditorView, number>();
function viewId(view: EditorView): number {
  let id = viewIds.get(view);
  if (!id) {
    id = ++viewCounter;
    viewIds.set(view, id);
  }
  return id;
}

class StrokeMarker implements LayerMarker {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly width: number,
    readonly height: number,
    readonly key: string,
    readonly svg: string,
  ) {}

  eq(other: StrokeMarker): boolean {
    return this.key === other.key && this.left === other.left && this.top === other.top;
  }

  draw(): HTMLElement {
    const el = document.createElement("div");
    el.className = "real-highlights-stroke";
    this.place(el);
    setMarkup(el, this.svg);
    return el;
  }

  update(el: HTMLElement, prev: StrokeMarker): boolean {
    if (prev.key !== this.key) return false;
    this.place(el);
    return true;
  }

  private place(el: HTMLElement): void {
    el.style.left = `${this.left}px`;
    el.style.top = `${this.top}px`;
    el.style.width = `${this.width}px`;
    el.style.height = `${this.height}px`;
  }
}

/** Ursprung des Layers (entspricht getBase() in CodeMirror). */
function layerBase(view: EditorView): { left: number; top: number } {
  const rect = view.scrollDOM.getBoundingClientRect();
  return {
    left: rect.left - view.scrollDOM.scrollLeft * view.scaleX,
    top: rect.top - view.scrollDOM.scrollTop * view.scaleY,
  };
}

export function buildMarkers(view: EditorView, ctx: LivePreviewContext): StrokeMarker[] {
  if (!ctx.config(view, null)) return [];
  const base = layerBase(view);
  const markers: StrokeMarker[] = [];
  const seen = new Map<string, number>();
  const vid = viewId(view);

  for (const run of collectHighlightRuns(view.contentDOM)) {
    const config = ctx.config(view, run.color);
    if (!config) continue;
    const rects = Array.from(rangeForRun(run).getClientRects()).map((r) => ({
      left: (r.left - base.left) / view.scaleX,
      top: (r.top - base.top) / view.scaleY,
      width: r.width / view.scaleX,
      height: r.height / view.scaleY,
    }));
    mergeLineRects(rects).forEach((line, lineIndex) => {
      const res = ctx.cache.generate({
        ...config,
        text: run.text,
        width: line.width,
        height: line.height,
        lineIndex,
        idPrefix: "rmlpTMP",
      });
      // Stabile, dokumentweit eindeutige IDs: View + Cache-Key + Vorkommen.
      const n = seen.get(res.cacheKey) ?? 0;
      seen.set(res.cacheKey, n + 1);
      const prefix = `rmlp${vid}-${res.cacheKey}-${n}`;
      const svg = res.svg.split("rmlpTMP").join(prefix);
      const x = Math.round((line.x + res.offsetX) * 100) / 100;
      const y = Math.round((line.y + res.offsetY) * 100) / 100;
      markers.push(new StrokeMarker(x, y, res.width, res.height, prefix, svg));
    });
  }
  return markers;
}

export function livePreviewExtension(ctx: LivePreviewContext) {
  return layer({
    above: false,
    class: "real-highlights-cm-layer",
    update(update: ViewUpdate): boolean {
      return (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged ||
        update.transactions.some((tr) => tr.effects.some((e) => e.is(refreshMarkersEffect)))
      );
    },
    markers: (view) => buildMarkers(view, ctx),
  });
}
