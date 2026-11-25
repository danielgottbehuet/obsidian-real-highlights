/**
 * Rendert die Markerstriche einer Menge von <mark>-Elementen in eine Ebene
 * hinter dem Text eines Bezugscontainers. Wird vom Reading Mode und von der
 * Vorschau in den Einstellungen verwendet (DOM-abhängig, ohne "obsidian").
 */
import type { MarkerConfig } from "../../engine";
import type { RenderCache } from "../../shared/RenderCache";
import { measureLines } from "../../shared/TextMeasurement";
import { leadingColorEmoji, seedText } from "./highlightColors";
import { setMarkupIfChanged } from "./markup";

export const ROOT_CLASS = "real-highlights-root";
export const LAYER_CLASS = "real-highlights-layer";

let instanceCounter = 0;
/** Eindeutiges ID-Präfix pro Render-Instanz (SVG-IDs müssen dokumentweit eindeutig sein). */
export function nextInstanceId(): number {
  return ++instanceCounter;
}

function ensureLayer(root: HTMLElement): HTMLElement {
  root.classList.add(ROOT_CLASS);
  let layer = root.querySelector<HTMLElement>(`:scope > .${LAYER_CLASS}`);
  if (!layer) {
    layer = root.createDiv({ cls: LAYER_CLASS, attr: { "aria-hidden": "true" }, prepend: true });
  }
  return layer;
}

export function clearLayer(root: HTMLElement): void {
  root.querySelector(`:scope > .${LAYER_CLASS}`)?.remove();
  root.classList.remove(ROOT_CLASS);
}

/**
 * Bezugscontainer einer Markierung: Elemente mit eigenem Hintergrund (Callouts,
 * Tabellenzellen) erhalten eine eigene Ebene, sonst würde ihr Hintergrund die
 * Striche verdecken.
 */
export function rootForMark(mark: HTMLElement, fallback: HTMLElement): HTMLElement {
  const local = mark.closest<HTMLElement>(".callout-content, td, th");
  return local && fallback.contains(local) ? local : fallback;
}

export interface MarkLayerOptions {
  cache: RenderCache;
  /** Konfiguration je Markierung (z. B. abhängig von der Highlight-Farbe). */
  config: (mark: HTMLElement) => MarkerConfig;
  idPrefix: string;
}

export const COLOR_EMOJI_CLASS = "real-highlights-color-emoji";

/**
 * Obsidian-Versionen ohne Farbunterstützung (getestet: 1.13.7) zeigen das
 * Farb-Emoji (==🔴Text==) als Text. Wir kapseln es in ein Span, das per CSS nur
 * ausgeblendet wird, solange Real Highlights aktiv ist. Idempotent; mit
 * Farbunterstützung (getestet: 1.15.1) enthält das <mark> kein Emoji und es passiert nichts.
 */
export function wrapColorEmoji(mark: HTMLElement): void {
  if (mark.querySelector(`.${COLOR_EMOJI_CLASS}`)) return;
  const first = mark.firstChild;
  if (!first?.instanceOf(Text)) return;
  const lead = leadingColorEmoji(first.data);
  if (!lead) return;
  first.splitText(lead.emoji.length);
  // Span vor das Emoji setzen und das Emoji hineinverschieben.
  const span = mark.createSpan({ cls: COLOR_EMOJI_CLASS, prepend: true });
  span.appendChild(first);
}

/** Misst und rendert alle Markierungen. Liefert die Anzahl erzeugter Striche. */
export function renderMarks(container: HTMLElement, marks: HTMLElement[], opts: MarkLayerOptions): number {
  // Gruppieren nach Bezugscontainer.
  const groups = new Map<HTMLElement, HTMLElement[]>();
  for (const m of marks) {
    const root = rootForMark(m, container);
    const list = groups.get(root) ?? [];
    list.push(m);
    groups.set(root, list);
  }

  // Ebenen entfernen, die keine Markierungen mehr enthalten.
  container.querySelectorAll<HTMLElement>(`.${ROOT_CLASS}`).forEach((r) => {
    if (!groups.has(r)) clearLayer(r);
  });
  if (container.classList.contains(ROOT_CLASS) && !groups.has(container)) clearLayer(container);

  // Erst alle Messungen (Layout lesen) …
  const measured = [...groups].map(([root, list]) => ({
    root,
    items: list.map((m) => ({
      text: seedText(m.textContent ?? ""),
      config: opts.config(m),
      lines: measureLines(m, root),
    })),
  }));

  // … dann schreiben.
  let count = 0;
  measured.forEach(({ root, items }, g) => {
    let html = "";
    items.forEach(({ text, config, lines }, i) => {
      lines.forEach((line, lineIndex) => {
        const r = opts.cache.generate({
          ...config,
          text,
          width: line.width,
          height: line.height,
          lineIndex,
          idPrefix: `${opts.idPrefix}-${g}-${i}-${lineIndex}`,
        });
        const x = Math.round((line.x + r.offsetX) * 100) / 100;
        const y = Math.round((line.y + r.offsetY) * 100) / 100;
        html += `<div style="left:${x}px;top:${y}px;width:${r.width}px;height:${r.height}px">${r.svg}</div>`;
        count++;
      });
    });
    const layer = ensureLayer(root);
    setMarkupIfChanged(layer, html);
  });
  return count;
}
