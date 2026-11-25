/**
 * Erkennung von Highlights im Live-Preview-DOM von Obsidian.
 *
 * Obsidian rendert `==Text==` im Live Preview als Spans mit der Klasse
 * `cm-highlight`; die `==`-Zeichen tragen zusätzlich `cm-formatting` /
 * `cm-formatting-highlight` und sind nur sichtbar, wenn der Cursor in der
 * Markierung steht. Farbige Highlights (`==🔴Text==`) tragen in Versionen mit
 * Farbunterstützung (getestet: 1.15.1) zusätzlich `cm-highlight-<farbe>`.
 * Versionen ohne Farbunterstützung (getestet: 1.13.7) zeigen das Farb-Emoji als
 * Text; es wird dann aus Text und Strich herausgenommen.
 *
 * Wir werten das gerenderte DOM aus (statt den Parser nachzubauen) und
 * ignorieren Formatierungszeichen. Dadurch ist der Text – und damit der Seed –
 * identisch zum Reading Mode und bleibt beim Bearbeiten stabil.
 */
import type { HighlightColor } from "../core/highlightColors";
import { classColor, leadingColorEmoji } from "../core/highlightColors";

export interface HighlightRun {
  /** Sichtbarer Text ohne Formatierungszeichen und Farb-Emoji (bestimmt den Seed). */
  text: string;
  /** Obsidian-Highlight-Farbe oder null für die Standardfarbe. */
  color: HighlightColor | null;
  startNode: Text;
  /** Versatz im ersten Textknoten (z. B. hinter einem sichtbaren Farb-Emoji). */
  startOffset: number;
  endNode: Text;
}

const HIGHLIGHT = "cm-highlight";
const FORMATTING = "cm-formatting";
const FORMATTING_HIGHLIGHT = "cm-formatting-highlight";

export function collectHighlightRuns(root: Element): HighlightRun[] {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const runs: HighlightRun[] = [];
  let cur: HighlightRun | null = null;
  /** Farbe aus einem bereits gesehenen, sichtbaren Emoji, bevor Inhalt folgt. */
  let pendingColor: HighlightColor | null = null;

  const close = () => {
    if (cur && cur.text.length > 0) runs.push(cur);
    cur = null;
    pendingColor = null;
  };

  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!node.data) continue;
    const el = node.parentElement;
    if (!el) continue;
    const hl = el.closest(`.${HIGHLIGHT}`);
    if (!hl || !root.contains(hl)) {
      // Normaler Text beendet eine Markierung.
      close();
      continue;
    }
    const formatting = el.closest(`.${FORMATTING}`);
    if (formatting) {
      // Schließendes `==` beendet die Markierung, andere Formatierung (z. B. `**`) wird übersprungen.
      if (formatting.classList.contains(FORMATTING_HIGHLIGHT) && cur && (cur as HighlightRun).text.length > 0) close();
      continue;
    }

    const color = classColor(el) ?? classColor(hl);
    // Farbwechsel ohne Text dazwischen = zwei direkt aufeinanderfolgende Markierungen.
    if (cur && color !== (cur as HighlightRun).color && !(pendingColor && color === null)) close();

    let offset = 0;
    if (!cur) {
      // Versionen ohne Farbunterstützung: sichtbares Farb-Emoji am Anfang.
      const lead = leadingColorEmoji(node.data);
      if (lead) {
        pendingColor = lead.color;
        offset = lead.emoji.length;
        if (offset >= node.data.length) continue;
      }
      cur = { text: "", color: color ?? pendingColor, startNode: node, startOffset: offset, endNode: node };
    }
    cur.text += node.data.slice(offset);
    cur.endNode = node;
  }
  close();
  return runs;
}

/** DOM-Range über den sichtbaren Text einer Markierung. */
export function rangeForRun(run: HighlightRun): Range {
  const range = run.startNode.ownerDocument.createRange();
  range.setStart(run.startNode, run.startOffset);
  range.setEnd(run.endNode, run.endNode.data.length);
  return range;
}
