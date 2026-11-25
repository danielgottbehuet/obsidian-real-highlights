/**
 * Setzt generiertes Markup ohne innerHTML (Obsidian-Review-Richtlinien).
 *
 * Das Markup stammt ausschließlich aus der eigenen Engine (SVG mit validierten
 * Farben und bereinigten IDs) bzw. aus den eigenen Übersetzungen – nie aus
 * Notizinhalten. Geparst wird mit dem HTML-Parser, der SVG-Elemente und
 * -Attribute (clipPath, gradientUnits …) korrekt behandelt.
 */
export function setMarkup(el: HTMLElement, markup: string): void {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${markup}`, "text/html");
  const nodes = Array.from(doc.body.childNodes).map((n) => el.ownerDocument.importNode(n, true));
  el.replaceChildren(...nodes);
}

const lastMarkup = new WeakMap<HTMLElement, string>();

/** Wie setMarkup, überspringt aber identisches Markup (vermeidet unnötige DOM-Arbeit). */
export function setMarkupIfChanged(el: HTMLElement, markup: string): void {
  if (lastMarkup.get(el) === markup && el.childNodes.length > 0 === markup.length > 0) return;
  setMarkup(el, markup);
  lastMarkup.set(el, markup);
}

/**
 * Baut einen Text mit <mark>…</mark>-Abschnitten (aus den Übersetzungen) als
 * DOM auf, ohne HTML zu parsen.
 */
export function appendMarkedText(parent: HTMLElement, text: string, attrs: Record<string, string> = {}): void {
  const doc = parent.ownerDocument;
  const parts = text.split(/<mark>(.*?)<\/mark>/);
  parts.forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) {
      const mark = doc.createElement("mark");
      for (const [k, v] of Object.entries(attrs)) mark.setAttribute(k, v);
      mark.textContent = part;
      parent.appendChild(mark);
    } else {
      parent.appendChild(doc.createTextNode(part));
    }
  });
}
