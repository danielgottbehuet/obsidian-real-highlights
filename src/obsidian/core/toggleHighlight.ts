/** Minimales Editor-Interface (kompatibel mit obsidian.Editor), damit die Logik testbar bleibt. */
export interface EditorLike {
  getSelection(): string;
  replaceSelection(text: string): void;
  getCursor(which?: "from" | "to" | "head" | "anchor"): { line: number; ch: number };
  getRange(from: { line: number; ch: number }, to: { line: number; ch: number }): string;
  replaceRange(text: string, from: { line: number; ch: number }, to?: { line: number; ch: number }): void;
  setSelection(anchor: { line: number; ch: number }, head?: { line: number; ch: number }): void;
}

const MARK = "==";

/**
 * Setzt oder entfernt `==` um die Auswahl. Erkennt sowohl Auswahlen inklusive
 * als auch exklusive der Markierungszeichen.
 */
export function toggleHighlight(editor: EditorLike): void {
  const sel = editor.getSelection();
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");

  // Auswahl enthält die Zeichen selbst: ==Text==
  if (sel.length >= 4 && sel.startsWith(MARK) && sel.endsWith(MARK)) {
    editor.replaceSelection(sel.slice(2, -2));
    return;
  }

  // Zeichen stehen direkt um die Auswahl herum.
  const before = from.ch >= 2 ? editor.getRange({ line: from.line, ch: from.ch - 2 }, from) : "";
  const after = editor.getRange(to, { line: to.line, ch: to.ch + 2 });
  if (before === MARK && after === MARK) {
    editor.replaceRange("", to, { line: to.line, ch: to.ch + 2 });
    editor.replaceRange("", { line: from.line, ch: from.ch - 2 }, from);
    const endCh = from.line === to.line ? to.ch - 2 : to.ch;
    editor.setSelection({ line: from.line, ch: from.ch - 2 }, { line: to.line, ch: endCh });
    return;
  }

  if (sel.length === 0) {
    editor.replaceSelection(MARK + MARK);
    editor.setSelection({ line: from.line, ch: from.ch + 2 });
    return;
  }

  editor.replaceSelection(MARK + sel + MARK);
}
