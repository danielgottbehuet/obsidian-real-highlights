/** Hilfsfunktionen für den editierbaren Vorschautext. */

const ALLOWED = new Set(["MARK", "B", "STRONG", "I", "EM", "BR", "P", "DIV"]);

/** Erlaubt nur Text und einfache Formatierungen (für gespeicherte/importierte Inhalte). */
export function sanitizeEditorHtml(html: string): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const out = document.createElement("div");
  const copy = (src: Node, dst: Node) => {
    for (const child of Array.from(src.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        dst.appendChild(document.createTextNode(child.textContent ?? ""));
      } else if (child instanceof Element) {
        if (ALLOWED.has(child.tagName)) {
          const el = document.createElement(child.tagName.toLowerCase());
          copy(child, el);
          dst.appendChild(el);
        } else {
          copy(child, dst);
        }
      }
    }
  };
  copy(tpl.content, out);
  return out.innerHTML;
}

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  parent.normalize();
}

/** Markiert die aktuelle Auswahl innerhalb des Editors. */
export function markSelection(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed || !editor.contains(range.commonAncestorContainer)) return false;
  // Nicht in eine bestehende Markierung hinein verschachteln.
  const parentMark = (range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement
  )?.closest("mark");
  if (parentMark && editor.contains(parentMark)) unwrap(parentMark);

  const mark = document.createElement("mark");
  const fragment = range.extractContents();
  fragment.querySelectorAll("mark").forEach(unwrap);
  mark.appendChild(fragment);
  range.insertNode(mark);
  sel.removeAllRanges();
  return true;
}

/** Entfernt alle Markierungen, die die aktuelle Auswahl berühren. */
export function unmarkSelection(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  const marks = Array.from(editor.querySelectorAll("mark")).filter((m) => range.intersectsNode(m));
  marks.forEach(unwrap);
  return marks.length > 0;
}
