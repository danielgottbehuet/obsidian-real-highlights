import type { App, SettingDefinitionItem } from "obsidian";
import { PluginSettingTab } from "obsidian";
import type { BlendMode, PresetId } from "../engine";
import { MARKER_COLORS, MARKER_PRESETS } from "../engine";
import type { HighlightColor } from "./core/highlightColors";
import { DEFAULT_PALETTE, HIGHLIGHT_COLORS, HIGHLIGHT_EMOJI, isHighlightColor, markColor } from "./core/highlightColors";
import type { MessageKey } from "./core/i18n";
import { appendMarkedText } from "./core/markup";
import { nextInstanceId, renderMarks } from "./core/markLayer";
import type { RealHighlightsSettings } from "./core/pluginConfig";
import {
  DEFAULT_SETTINGS,
  anyModeActive,
  currentTheme,
  presetSettingValues,
  settingsToConfig,
} from "./core/pluginConfig";
import type RealHighlightsPlugin from "./main";
// Offizielles Buy-Me-a-Coffee-Banner, beim Build als data-URL eingebettet (kein Netzwerkzugriff).
import bmcButton from "./assets/bmc-button.png";

/** Fallback, falls das Manifest keine fundingUrl liefert. */
const FUNDING_URL = "https://buymeacoffee.com/derscottbert";

const BLEND_OPTIONS: Record<BlendMode, string> = {
  multiply: "Multiply",
  normal: "Normal",
  screen: "Screen",
  darken: "Darken",
  lighten: "Lighten",
};

/** Virtueller Schlüssel: Auswahl der Standardfarbe aus den Vorgaben. */
const COLOR_CHOICE = "colorChoice";
const CUSTOM = "custom";
const PALETTE_PREFIX = "palette.";

const fmt2 = (v: number) => v.toFixed(2);

/**
 * Einstellungen über die deklarative Settings-API (Obsidian ≥ 1.13): Obsidian
 * rendert die Seite selbst und nimmt alle Einträge in die Einstellungssuche auf.
 * Vorschau und Fußbereich sind `render`-Einträge mit eigener Darstellung.
 */
export class RealHighlightsSettingTab extends PluginSettingTab {
  private previewEl: HTMLElement | null = null;
  private readonly previewId = nextInstanceId();

  constructor(
    app: App,
    private readonly plugin: RealHighlightsPlugin,
  ) {
    super(app, plugin);
  }

  private t(key: MessageKey): string {
    return this.plugin.i18n.t(key);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const t = (key: MessageKey) => this.t(key);
    const i18n = this.plugin.i18n;
    const slider = (key: keyof RealHighlightsSettings, min: number, max: number, step: number) =>
      ({ type: "slider", key, min, max, step, displayFormat: fmt2 }) as const;

    const colorOptions: Record<string, string> = {};
    for (const c of MARKER_COLORS) colorOptions[c.hex] = i18n.penColor(c.id, c.name);
    colorOptions[CUSTOM] = t("setting.color.custom");

    return [
      {
        name: t("setting.preview.name"),
        searchable: false,
        render: (setting) => this.renderPreviewRow(setting.settingEl),
      },
      {
        type: "group",
        items: [
          {
            name: t("setting.readingMode.name"),
            desc: t("setting.readingMode.desc"),
            control: { type: "toggle", key: "readingMode" },
          },
          {
            name: t("setting.livePreview.name"),
            desc: t("setting.livePreview.desc"),
            control: { type: "toggle", key: "livePreview" },
          },
        ],
      },
      {
        type: "group",
        heading: t("heading.marker"),
        items: [
          {
            name: t("setting.preset.name"),
            desc: t("setting.preset.desc"),
            control: {
              type: "dropdown",
              key: "preset",
              options: Object.fromEntries(MARKER_PRESETS.map((p) => [p.id, p.name])),
            },
          },
          {
            name: t("setting.color.name"),
            desc: t("setting.color.desc"),
            control: { type: "dropdown", key: COLOR_CHOICE, options: colorOptions },
          },
          {
            name: t("setting.customColor.name"),
            control: { type: "color", key: "color" },
          },
          { name: t("setting.opacity.name"), control: slider("opacity", 0, 1, 0.01) },
          {
            name: t("setting.strokeHeight.name"),
            desc: t("setting.strokeHeight.desc"),
            control: slider("strokeHeight", 0.5, 1.4, 0.01),
          },
          { name: t("setting.roughness.name"), control: slider("roughness", 0, 1, 0.01) },
          { name: t("setting.fiberIntensity.name"), control: slider("fiberIntensity", 0, 1, 0.01) },
          {
            name: t("setting.inkIntensity.name"),
            desc: t("setting.inkIntensity.desc"),
            control: slider("inkIntensity", 0, 2, 0.05),
          },
        ],
      },
      {
        type: "group",
        heading: t("heading.colors"),
        extraButtons: [
          (b) =>
            b
              .setIcon("rotate-ccw")
              .setTooltip(t("setting.colors.reset"))
              .onClick(() => void this.apply({ palette: { ...DEFAULT_PALETTE } }, true)),
        ],
        items: [
          { name: t("setting.colors.syntax.name"), desc: t("heading.colors.desc") },
          ...HIGHLIGHT_COLORS.map((color) => ({
            name: `${HIGHLIGHT_EMOJI[color]} ${i18n.highlightColor(color)}`,
            aliases: [color],
            control: { type: "color" as const, key: `${PALETTE_PREFIX}${color}` },
          })),
        ],
      },
      {
        type: "group",
        heading: t("heading.light"),
        items: [
          {
            name: t("setting.lightBlend.name"),
            desc: t("setting.lightBlend.desc"),
            control: { type: "dropdown", key: "lightBlendMode", options: BLEND_OPTIONS },
          },
        ],
      },
      {
        type: "group",
        heading: t("heading.dark"),
        items: [
          {
            name: t("setting.darkBlend.name"),
            desc: t("setting.darkBlend.desc"),
            control: { type: "dropdown", key: "darkBlendMode", options: BLEND_OPTIONS },
          },
          {
            name: t("setting.darkOpacity.name"),
            desc: t("setting.darkOpacity.desc"),
            control: slider("darkOpacity", 0.1, 1, 0.01),
          },
        ],
      },
      {
        type: "group",
        items: [
          {
            name: t("setting.reset.name"),
            desc: t("setting.reset.desc"),
            render: (setting) => {
              setting.addButton((b) =>
                b
                  .setButtonText(t("button.reset"))
                  .setDestructive()
                  .onClick(() => void this.apply({ ...DEFAULT_SETTINGS }, true)),
              );
            },
          },
        ],
      },
      {
        name: t("support.text"),
        searchable: false,
        render: (setting) => this.renderFooter(setting.settingEl),
      },
    ];
  }

  getControlValue(key: string): unknown {
    const s = this.plugin.settings;
    if (key === COLOR_CHOICE) return MARKER_COLORS.some((c) => c.hex === s.color) ? s.color : CUSTOM;
    if (key.startsWith(PALETTE_PREFIX)) {
      const color = key.slice(PALETTE_PREFIX.length);
      return isHighlightColor(color) ? s.palette[color] : undefined;
    }
    return s[key as keyof RealHighlightsSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const s = this.plugin.settings;
    if (key === "preset") {
      // Ein Preset setzt auch die von ihm abhängigen Regler -> Seite neu aufbauen.
      const preset = value as PresetId;
      return this.apply({ preset, ...presetSettingValues(preset) }, true);
    }
    if (key === COLOR_CHOICE) {
      if (value === CUSTOM) return;
      return this.apply({ color: value as string }, true);
    }
    if (key === "color") return this.apply({ color: value as string }, true);
    if (key.startsWith(PALETTE_PREFIX)) {
      const color = key.slice(PALETTE_PREFIX.length) as HighlightColor;
      return this.apply({ palette: { ...s.palette, [color]: value as string } });
    }
    return this.apply({ [key]: value });
  }

  /** Speichert eine Änderung, aktualisiert die Vorschau und bei Bedarf die ganze Seite. */
  private async apply(patch: Partial<RealHighlightsSettings>, rebuild = false): Promise<void> {
    await this.plugin.updateSettings(patch);
    if (rebuild) this.update();
    this.renderPreview();
  }

  // -------------------------------------------------------------------------
  // Eigene Darstellungen
  // -------------------------------------------------------------------------

  /** Live-Vorschau mit derselben Engine. */
  private renderPreviewRow(row: HTMLElement): () => void {
    row.empty();
    row.addClass("real-highlights-preview-row");
    const wrap = row.createDiv({ cls: "real-highlights-settings-preview markdown-rendered" });
    const preview = wrap.createDiv();
    appendMarkedText(preview.createEl("p"), this.t("preview.text"));
    const colorLine = preview.createEl("p");
    HIGHLIGHT_COLORS.forEach((c, i) => {
      if (i > 0) colorLine.appendText(" ");
      colorLine.createEl("mark", { text: this.plugin.i18n.highlightColor(c), attr: { "data-highlight": c } });
    });
    this.previewEl = preview;
    this.renderPreview();
    return () => {
      if (this.previewEl === preview) this.previewEl = null;
    };
  }

  /** Buy-Me-a-Coffee-Banner (eingebettet, kein Netzwerkzugriff) und Version. */
  private renderFooter(row: HTMLElement): void {
    row.empty();
    const manifest = this.plugin.manifest as typeof this.plugin.manifest & { fundingUrl?: unknown };
    const fundingUrl = typeof manifest.fundingUrl === "string" ? manifest.fundingUrl : FUNDING_URL;
    const footer = row.createDiv({ cls: "real-highlights-footer" });
    footer.createDiv({ cls: "real-highlights-support-text", text: this.t("support.text") });
    const link = footer.createEl("a", {
      cls: "real-highlights-coffee",
      href: fundingUrl,
      attr: { target: "_blank", rel: "noopener" },
    });
    link.createEl("img", {
      cls: "real-highlights-coffee-img",
      attr: { src: bmcButton, alt: this.t("support.link"), width: "217", height: "60" },
    });
    footer.createDiv({ cls: "real-highlights-version", text: `${manifest.name} ${manifest.version}` });
  }

  private renderPreview(): void {
    const el = this.previewEl;
    if (!el) return;
    // Erst rendern, wenn der Einstellungsdialog im Layout ist.
    window.requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const s = this.plugin.settings;
      const active = anyModeActive(s);
      el.parentElement?.toggleClass("real-highlights-preview-off", !active);
      const marks = active ? Array.from(el.querySelectorAll<HTMLElement>("mark")) : [];
      renderMarks(el, marks, {
        cache: this.plugin.cache,
        config: (m) => settingsToConfig(s, currentTheme(el.ownerDocument), markColor(m)),
        idPrefix: `rms${this.previewId}`,
      });
    });
  }
}
