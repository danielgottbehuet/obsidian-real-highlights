/**
 * Ermittlung tatsächlicher Textdimensionen und visueller Zeilen.
 * Gehört zur Integrationsschicht (DOM-abhängig), nicht zum Engine-Kern.
 */
import type { LineBox } from "../engine/MarkerEngine";

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Führt Rechtecke derselben visuellen Zeile zusammen (z. B. fett/kursiv
 * formatierte Teile oder mehrere Textknoten). Zwei Rechtecke gehören zur selben
 * Zeile, wenn sie sich vertikal um mindestens 50 % der kleineren Höhe überlappen.
 * Leere Rechtecke (z. B. an Zeilenumbrüchen) werden verworfen.
 */
export function mergeLineRects(rects: RectLike[], minWidth = 0.5): LineBox[] {
  const valid = rects
    .filter((r) => Number.isFinite(r.left) && Number.isFinite(r.top) && r.width >= minWidth && r.height > 0)
    .map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height }))
    .sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2) || a.x - b.x);

  const lines: LineBox[] = [];
  for (const r of valid) {
    const line = lines.find((l) => {
      const overlap = Math.min(l.y + l.height, r.y + r.height) - Math.max(l.y, r.y);
      return overlap >= 0.5 * Math.min(l.height, r.height);
    });
    if (!line) {
      lines.push({ ...r });
      continue;
    }
    const x0 = Math.min(line.x, r.x);
    const y0 = Math.min(line.y, r.y);
    const x1 = Math.max(line.x + line.width, r.x + r.width);
    const y1 = Math.max(line.y + line.height, r.y + r.height);
    line.x = x0;
    line.y = y0;
    line.width = x1 - x0;
    line.height = y1 - y0;
  }
  return lines.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Misst die visuellen Zeilen eines Elements (oder einer Range) relativ zu einem
 * positionierten Bezugscontainer.
 */
export function measureLines(target: Element | Range, container: Element): LineBox[] {
  let range: Range;
  if (target instanceof Range) {
    range = target;
  } else {
    range = document.createRange();
    range.selectNodeContents(target);
  }
  const origin = container.getBoundingClientRect();
  const style = getComputedStyle(container);
  const ox = origin.left + parseFloat(style.borderLeftWidth || "0") - container.scrollLeft;
  const oy = origin.top + parseFloat(style.borderTopWidth || "0") - container.scrollTop;

  const rects: RectLike[] = [];
  for (const r of Array.from(range.getClientRects())) {
    rects.push({ left: r.left - ox, top: r.top - oy, width: r.width, height: r.height });
  }
  return mergeLineRects(rects);
}
