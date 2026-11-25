import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type { BlendMode, PresetId } from "../engine";
import { MARKER_COLORS, MARKER_PRESETS } from "../engine";
import { DEFAULT_PALETTE, HIGHLIGHT_COLORS, HIGHLIGHT_EMOJI, markColor } from "./core/highlightColors";
import type { MessageKey } from "./core/i18n";
import { appendMarkedText } from "./core/markup";
import { nextInstanceId, renderMarks } from "./core/markLayer";
import {
  DEFAULT_SETTINGS,
  anyModeActive,
  currentTheme,
  presetSettingValues,
  settingsToConfig,
} from "./core/pluginConfig";
import type RealHighlightsPlugin from "./main";

/** Fallback, falls das Manifest keine fundingUrl liefert. */
const FUNDING_URL = "https://buymeacoffee.com/derscottbert";

const BLEND_OPTIONS: Record<BlendMode, string> = {
  multiply: "Multiply",
  normal: "Normal",
  screen: "Screen",
  darken: "Darken",
  lighten: "Lighten",
};


export class RealHighlightsSettingTab extends PluginSettingTab {
  private previewEl: HTMLElement | null = null;
  private readonly previewId = nextInstanceId();

  constructor(
    app: App,
    private readonly plugin: RealHighlightsPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const i18n = this.plugin.i18n;
    const t = (key: MessageKey) => i18n.t(key);

    // Live-Vorschau mit derselben Engine
    const wrap = containerEl.createDiv({ cls: "real-highlights-settings-preview markdown-rendered" });
    this.previewEl = wrap.createDiv();
    appendMarkedText(this.previewEl.createEl("p"), t("preview.text"));
    const colorLine = this.previewEl.createEl("p");
    HIGHLIGHT_COLORS.forEach((c, i) => {
      if (i > 0) colorLine.appendText(" ");
      colorLine.createEl("mark", { text: i18n.highlightColor(c), attr: { "data-highlight": c } });
    });

    new Setting(containerEl)
      .setName(t("setting.readingMode.name"))
      .setDesc(t("setting.readingMode.desc"))
      .addToggle((t) => t.setValue(s.readingMode).onChange((v) => this.patch({ readingMode: v })));

    new Setting(containerEl)
      .setName(t("setting.livePreview.name"))
      .setDesc(t("setting.livePreview.desc"))
      .addToggle((t) => t.setValue(s.livePreview).onChange((v) => this.patch({ livePreview: v })));

    new Setting(containerEl).setName(t("heading.marker")).setHeading();

    new Setting(containerEl)
      .setName(t("setting.preset.name"))
      .setDesc(t("setting.preset.desc"))
      .addDropdown((d) => {
        for (const p of MARKER_PRESETS) d.addOption(p.id, p.name);
        d.setValue(s.preset).onChange((v) => {
          const preset = v as PresetId;
          this.patch({ preset, ...presetSettingValues(preset) });
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t("setting.color.name"))
      .setDesc(t("setting.color.desc"))
      .addDropdown((d) => {
        for (const c of MARKER_COLORS) d.addOption(c.hex, i18n.penColor(c.id, c.name));
        d.addOption("custom", t("setting.color.custom"));
        d.setValue(MARKER_COLORS.some((c) => c.hex === s.color) ? s.color : "custom").onChange((v) => {
          if (v !== "custom") {
            this.patch({ color: v });
            this.display();
          }
        });
      })
      .addColorPicker((c) =>
        c.setValue(s.color).onChange((v) => {
          this.patch({ color: v });
        }),
      );

    this.slider(t("setting.opacity.name"), "opacity", 0, 1, 0.01);
    this.slider(t("setting.strokeHeight.name"), "strokeHeight", 0.5, 1.4, 0.01, t("setting.strokeHeight.desc"));
    this.slider(t("setting.roughness.name"), "roughness", 0, 1, 0.01);
    this.slider(t("setting.fiberIntensity.name"), "fiberIntensity", 0, 1, 0.01);
    this.slider(t("setting.inkIntensity.name"), "inkIntensity", 0, 2, 0.05, t("setting.inkIntensity.desc"));

    new Setting(containerEl)
      .setName(t("heading.colors"))
      .setDesc(t("heading.colors.desc"))
      .setHeading();
    for (const color of HIGHLIGHT_COLORS) {
      new Setting(containerEl)
        .setName(`${HIGHLIGHT_EMOJI[color]} ${i18n.highlightColor(color)}`)
        .addExtraButton((b) =>
          b
            .setIcon("rotate-ccw")
            .setTooltip(t("setting.colors.reset"))
            .onClick(() => {
              this.patch({ palette: { ...this.plugin.settings.palette, [color]: DEFAULT_PALETTE[color] } });
              this.display();
            }),
        )
        .addColorPicker((c) =>
          c.setValue(s.palette[color]).onChange((v) => {
            this.patch({ palette: { ...this.plugin.settings.palette, [color]: v } });
          }),
        );
    }

    new Setting(containerEl).setName(t("heading.light")).setHeading();
    new Setting(containerEl)
      .setName(t("setting.lightBlend.name"))
      .setDesc(t("setting.lightBlend.desc"))
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(BLEND_OPTIONS)) d.addOption(k, v);
        d.setValue(s.lightBlendMode).onChange((v) => this.patch({ lightBlendMode: v as BlendMode }));
      });

    new Setting(containerEl).setName(t("heading.dark")).setHeading();
    new Setting(containerEl)
      .setName(t("setting.darkBlend.name"))
      .setDesc(t("setting.darkBlend.desc"))
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(BLEND_OPTIONS)) d.addOption(k, v);
        d.setValue(s.darkBlendMode).onChange((v) => this.patch({ darkBlendMode: v as BlendMode }));
      });
    this.slider(t("setting.darkOpacity.name"), "darkOpacity", 0.1, 1, 0.01, t("setting.darkOpacity.desc"));

    new Setting(containerEl).addButton((b) =>
      b
        .setButtonText(t("button.reset"))
        .setWarning()
        .onClick(() => {
          this.patch({ ...DEFAULT_SETTINGS });
          this.display();
        }),
    );

    // Dezenter Unterstützungs-Link (reiner Textlink, lädt nichts aus dem Netz).
    const funding = (this.plugin.manifest as { fundingUrl?: unknown }).fundingUrl;
    const fundingUrl = typeof funding === "string" ? funding : FUNDING_URL;
    const support = containerEl.createDiv({ cls: "real-highlights-support" });
    support.appendText(`${t("support.text")} `);
    support.createEl("a", {
      text: `☕ ${t("support.link")}`,
      href: fundingUrl,
      attr: { target: "_blank", rel: "noopener" },
    });

    this.renderPreview();
  }

  private slider(
    name: string,
    key: "opacity" | "strokeHeight" | "roughness" | "fiberIntensity" | "inkIntensity" | "darkOpacity",
    min: number,
    max: number,
    step: number,
    desc?: string,
  ): void {
    const setting = new Setting(this.containerEl).setName(name);
    if (desc) setting.setDesc(desc);
    setting.addSlider((sl) =>
      sl
        .setLimits(min, max, step)
        .setValue(this.plugin.settings[key])
        .setDynamicTooltip()
        .onChange((v) => this.patch({ [key]: v })),
    );
  }

  private patch(patch: Partial<typeof DEFAULT_SETTINGS>): void {
    void this.plugin.updateSettings(patch);
    this.renderPreview();
  }

  private renderPreview(): void {
    const el = this.previewEl;
    if (!el) return;
    // Erst rendern, wenn der Einstellungsdialog im Layout ist.
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const s = this.plugin.settings;
      const marks = Array.from(el.querySelectorAll<HTMLElement>("mark"));
      const active = anyModeActive(s);
      el.parentElement?.toggleClass("real-highlights-preview-off", !active);
      if (!active) {
        renderMarks(el, [], { cache: this.plugin.cache, config: () => settingsToConfig(s, "light"), idPrefix: "x" });
        return;
      }
      renderMarks(el, marks, {
        cache: this.plugin.cache,
        config: (m) => settingsToConfig(s, currentTheme(), markColor(m)),
        idPrefix: `rms${this.previewId}`,
      });
    });
  }

  hide(): void {
    this.previewEl = null;
    this.containerEl.empty();
  }
}
