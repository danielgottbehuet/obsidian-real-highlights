import { describe, expect, it } from "vitest";
import { presetConfig } from "../../src/engine";
import {
  DEFAULT_SETTINGS,
  presetSettingValues,
  sanitizeSettings,
  settingsToConfig,
  toggleAllModes,
} from "../../src/obsidian/core/pluginConfig";

describe("Plugin-Einstellungen", () => {
  it("Standardwerte entsprechen dem freigegebenen Classic-Preset", () => {
    const cfg = settingsToConfig(DEFAULT_SETTINGS, "light");
    expect(cfg).toEqual(presetConfig("classic"));
  });

  it("ungültige gespeicherte Daten werden bereinigt", () => {
    const s = sanitizeSettings({
      readingMode: "ja",
      preset: "unbekannt",
      color: "red",
      opacity: 7,
      darkOpacity: NaN,
      lightBlendMode: "overlay",
    });
    expect(s.readingMode).toBe(true);
    expect(s.preset).toBe("classic");
    expect(s.color).toBe(DEFAULT_SETTINGS.color);
    expect(s.opacity).toBe(1);
    expect(s.darkOpacity).toBe(0.5);
    expect(s.lightBlendMode).toBe("multiply");
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("Preset-Werte werden übernommen, Tintenintensität skaliert Start/Ende", () => {
    const s = sanitizeSettings({ preset: "heavy", ...presetSettingValues("heavy"), inkIntensity: 0.5 });
    const cfg = settingsToConfig(s, "light");
    const heavy = presetConfig("heavy");
    expect(cfg.opacity).toBe(heavy.opacity);
    expect(cfg.startInk).toBeCloseTo(heavy.startInk * 0.5);
    expect(cfg.endInk).toBeCloseTo(heavy.endInk * 0.5);
    expect(cfg.inkGrain).toBe(heavy.inkGrain);
  });

  it("Migration: früheres enabled:false schaltet beide Modi ab", () => {
    const s = sanitizeSettings({ enabled: false, readingMode: true, livePreview: true });
    expect([s.readingMode, s.livePreview]).toEqual([false, false]);
    expect("enabled" in s).toBe(false);
    const t = sanitizeSettings({ enabled: true, readingMode: false, livePreview: true });
    expect([t.readingMode, t.livePreview]).toEqual([false, true]);
  });

  it("Befehl schaltet beide Modi gemeinsam", () => {
    const both = sanitizeSettings({});
    expect(toggleAllModes(both)).toEqual({ readingMode: false, livePreview: false });
    const one = sanitizeSettings({ readingMode: false, livePreview: true });
    expect(toggleAllModes(one)).toEqual({ readingMode: false, livePreview: false });
    const none = sanitizeSettings({ readingMode: false, livePreview: false });
    expect(toggleAllModes(none)).toEqual({ readingMode: true, livePreview: true });
  });

  it("Light- und Dark-Mode-Konfiguration", () => {
    const s = sanitizeSettings({ lightBlendMode: "darken", darkBlendMode: "screen", darkOpacity: 0.3 });
    expect(settingsToConfig(s, "light").blendMode).toBe("darken");
    const dark = settingsToConfig(s, "dark");
    expect(dark.blendMode).toBe("screen");
    expect(dark.opacity).toBeCloseTo(s.opacity * 0.3);
  });
});
