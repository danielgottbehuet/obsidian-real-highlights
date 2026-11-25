import { describe, expect, it } from "vitest";
import { toggleHighlight, type EditorLike } from "../../src/obsidian/core/toggleHighlight";

/** Einzeiliger Fake-Editor. */
function fake(text: string, from: number, to: number) {
  const s = { text, from, to };
  const ed: EditorLike = {
    getSelection: () => s.text.slice(s.from, s.to),
    replaceSelection: (t) => {
      s.text = s.text.slice(0, s.from) + t + s.text.slice(s.to);
      s.from = s.to = s.from + t.length;
    },
    getCursor: (w) => ({ line: 0, ch: w === "to" ? s.to : s.from }),
    getRange: (a, b) => s.text.slice(a.ch, b.ch),
    replaceRange: (t, a, b) => {
      s.text = s.text.slice(0, a.ch) + t + s.text.slice((b ?? a).ch);
    },
    setSelection: (a, b) => {
      s.from = a.ch;
      s.to = (b ?? a).ch;
    },
  };
  return { ed, s };
}

describe("Markierung umschalten", () => {
  it("setzt == um die Auswahl", () => {
    const { ed, s } = fake("ein Wort hier", 4, 8);
    toggleHighlight(ed);
    expect(s.text).toBe("ein ==Wort== hier");
  });

  it("entfernt == bei Auswahl inklusive Zeichen", () => {
    const { ed, s } = fake("ein ==Wort== hier", 4, 12);
    toggleHighlight(ed);
    expect(s.text).toBe("ein Wort hier");
  });

  it("entfernt == bei Auswahl innerhalb der Zeichen", () => {
    const { ed, s } = fake("ein ==Wort== hier", 6, 10);
    toggleHighlight(ed);
    expect(s.text).toBe("ein Wort hier");
    expect(s.text.slice(s.from, s.to)).toBe("Wort");
  });

  it("fügt bei leerer Auswahl ==== ein und setzt den Cursor dazwischen", () => {
    const { ed, s } = fake("ab", 1, 1);
    toggleHighlight(ed);
    expect(s.text).toBe("a====b");
    expect(s.from).toBe(3);
  });
});
