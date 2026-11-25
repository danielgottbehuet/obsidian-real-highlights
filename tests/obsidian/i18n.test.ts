import { describe, expect, it } from "vitest";
import { createTranslator, resolveLanguage } from "../../src/obsidian/core/i18n";
import { HIGHLIGHT_COLORS } from "../../src/obsidian/core/highlightColors";
import { MARKER_COLORS } from "../../src/engine";

describe("Übersetzungen", () => {
  it("Sprache folgt Obsidian: Deutsch bei de*, sonst Englisch", () => {
    expect(resolveLanguage("de")).toBe("de");
    expect(resolveLanguage("de-AT")).toBe("de");
    expect(resolveLanguage("en")).toBe("en");
    expect(resolveLanguage("fr")).toBe("en");
    expect(resolveLanguage(null)).toBe("en");
  });

  it("alle Texte und Farbnamen sind in beiden Sprachen vorhanden", () => {
    const en = createTranslator("en");
    const de = createTranslator("de");
    expect(en.t("command.toggleHighlight")).toBe("Toggle highlight");
    expect(de.t("command.toggleHighlight")).toBe("Markierung umschalten");
    for (const c of HIGHLIGHT_COLORS) {
      expect(en.highlightColor(c)).toBeTruthy();
      expect(de.highlightColor(c)).toBeTruthy();
    }
    for (const c of MARKER_COLORS) {
      expect(en.penColor(c.id, "?")).not.toBe("?");
      expect(de.penColor(c.id, "?")).not.toBe("?");
    }
  });

  it("Vorschautext enthält in beiden Sprachen Markierungen", () => {
    for (const lang of ["en", "de"] as const) {
      expect((createTranslator(lang).t("preview.text").match(/<mark>/g) ?? []).length).toBe(2);
    }
  });
});
