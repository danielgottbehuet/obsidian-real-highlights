// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { collectHighlightRuns } from "../../src/obsidian/integrations/highlightDom";

function dom(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

const H = (t: string, extra = "") => `<span class="cm-highlight${extra}">${t}</span>`;
const F = (t: string) => `<span class="cm-formatting cm-formatting-highlight cm-highlight">${t}</span>`;

describe("Highlight-Erkennung im Live Preview", () => {
  it("erkennt Markierungen bei ausgeblendeten ==", () => {
    const root = dom(`<div class="cm-line">Text ${H("eins")} und ${H("zwei drei")}.</div>`);
    expect(collectHighlightRuns(root).map((r) => r.text)).toEqual(["eins", "zwei drei"]);
  });

  it("ignoriert sichtbare == und andere Formatierung (Seed bleibt stabil)", () => {
    const root = dom(
      `<div class="cm-line">${F("==")}${H("<span class='cm-formatting cm-formatting-strong'>**</span>")}` +
        `${H("fett", " cm-strong")}${H("<span class='cm-formatting cm-formatting-strong'>**</span>")}${H(" Text")}${F("==")}</div>`,
    );
    expect(collectHighlightRuns(root).map((r) => r.text)).toEqual(["fett Text"]);
  });

  it("trennt direkt aufeinanderfolgende Markierungen an == ", () => {
    const root = dom(`<div class="cm-line">${F("==")}${H("a")}${F("==")}${F("==")}${H("b")}${F("==")}</div>`);
    expect(collectHighlightRuns(root).map((r) => r.text)).toEqual(["a", "b"]);
  });

  it("ein Highlight über mehrere Textknoten ergibt einen Lauf", () => {
    const root = dom(`<div class="cm-line">${H("Anfang ")}${H("<em>kursiv</em>", " cm-em")}${H(" Ende")}</div>`);
    const runs = collectHighlightRuns(root);
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe("Anfang kursiv Ende");
    expect(runs[0].startNode.data).toBe("Anfang ");
    expect(runs[0].endNode.data).toBe(" Ende");
  });

  it("liefert nichts ohne Markierungen", () => {
    expect(collectHighlightRuns(dom(`<div class="cm-line">nur Text</div>`))).toEqual([]);
  });
});
