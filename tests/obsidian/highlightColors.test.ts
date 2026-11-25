// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { generateMarker } from "../../src/engine";
import {
  DEFAULT_PALETTE,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_EMOJI,
  leadingColorEmoji,
  markColor,
  seedText,
} from "../../src/obsidian/core/highlightColors";
import { COLOR_EMOJI_CLASS, wrapColorEmoji } from "../../src/obsidian/core/markLayer";
import { DEFAULT_SETTINGS, sanitizeSettings, settingsToConfig } from "../../src/obsidian/core/pluginConfig";
import { collectHighlightRuns } from "../../src/obsidian/integrations/highlightDom";

function el(html: string): HTMLElement {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d;
}

describe("Farbige Highlights (==🔴Text==)", () => {
  it("erkennt alle sechs Farb-Emojis", () => {
    for (const c of HIGHLIGHT_COLORS) {
      expect(leadingColorEmoji(`${HIGHLIGHT_EMOJI[c]}Text`)?.color).toBe(c);
    }
    expect(leadingColorEmoji("Text 🔴")).toBeNull();
    expect(leadingColorEmoji("😀 Text")).toBeNull();
  });

  it("Seed-Text ohne Emoji: Farbwechsel ändert nur die Farbe, nicht die Form", () => {
    expect(seedText("🔴Wichtig")).toBe("Wichtig");
    expect(seedText("Wichtig")).toBe("Wichtig");
    const geo = (text: string) =>
      generateMarker({ text: seedText(text), width: 120, height: 20, color: "#000000" }).svg;
    expect(geo("🔴Wichtig")).toBe(geo("🔵Wichtig"));
    expect(geo("🔴Wichtig")).toBe(geo("Wichtig"));
  });

  it("Reading Mode: Farbe aus data-highlight (mit Farbunterstützung) oder führendem Emoji (ohne)", () => {
    const root = el(
      `<mark data-highlight="red">A</mark><mark data-highlight="">B</mark><mark>🟢C</mark><mark data-highlight="pink">D</mark>`,
    );
    expect([...root.querySelectorAll<HTMLElement>("mark")].map(markColor)).toEqual(["red", null, "green", null]);
  });

  it("ohne Farbunterstützung: Emoji wird gekapselt (idempotent), Text bleibt erhalten", () => {
    const root = el(`<mark>🔵Text <b>fett</b></mark>`);
    const mark = root.querySelector("mark")!;
    wrapColorEmoji(mark);
    wrapColorEmoji(mark);
    expect(mark.querySelectorAll(`.${COLOR_EMOJI_CLASS}`)).toHaveLength(1);
    expect(mark.querySelector(`.${COLOR_EMOJI_CLASS}`)!.textContent).toBe("🔵");
    expect(mark.textContent).toBe("🔵Text fett");
    expect(markColor(mark)).toBe("blue");
  });

  it("Live Preview mit Farbunterstützung: Farbe aus cm-highlight-<farbe>", () => {
    const root = el(
      `<div class="cm-line">A <span class="cm-highlight cm-highlight-red">Rot</span> und ` +
        `<span class="cm-highlight cm-highlight-blue cm-strong">fett</span><span class="cm-highlight cm-highlight-blue"> blau</span> ` +
        `<span class="cm-highlight">Standard</span></div>`,
    );
    expect(collectHighlightRuns(root).map((r) => [r.text, r.color])).toEqual([
      ["Rot", "red"],
      ["fett blau", "blue"],
      ["Standard", null],
    ]);
  });

  it("Live Preview: direkt aufeinanderfolgende Markierungen verschiedener Farbe werden getrennt", () => {
    const root = el(
      `<div class="cm-line"><span class="cm-highlight cm-highlight-red">a</span><span contenteditable="false"></span>` +
        `<span class="cm-highlight cm-highlight-green">b</span></div>`,
    );
    expect(collectHighlightRuns(root).map((r) => r.color)).toEqual(["red", "green"]);
  });

  it("Live Preview ohne Farbunterstützung: sichtbares Emoji wird aus Text und Strich herausgenommen", () => {
    const root = el(`<div class="cm-line"><span class="cm-highlight">🟣Idee <em>neu</em></span></div>`);
    root.querySelector("em")!.className = "cm-highlight cm-em";
    const [run] = collectHighlightRuns(root);
    expect(run.text).toBe("Idee neu");
    expect(run.color).toBe("purple");
    expect(run.startOffset).toBe("🟣".length);
  });

  it("Palette: Standardwerte, eigene Farben und Bereinigung", () => {
    expect(DEFAULT_SETTINGS.palette).toEqual(DEFAULT_PALETTE);
    const s = sanitizeSettings({ palette: { red: "#123456", blue: "kaputt" } });
    expect(s.palette.red).toBe("#123456");
    expect(s.palette.blue).toBe(DEFAULT_PALETTE.blue);
    expect(settingsToConfig(s, "light", "red").color).toBe("#123456");
    expect(settingsToConfig(s, "light", null).color).toBe(s.color);
    expect(settingsToConfig(s, "dark", "green").color).toBe(DEFAULT_PALETTE.green);
  });
});
