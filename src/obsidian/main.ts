import type { EditorView } from "@codemirror/view";
import type { Editor, Menu } from "obsidian";
import * as obsidian from "obsidian";
import { MarkdownView, Plugin, editorLivePreviewField } from "obsidian";
import type { MarkerConfig } from "../engine";
import { RenderCache } from "../shared/RenderCache";
import type { RealHighlightsSettings } from "./core/pluginConfig";
import { currentTheme, sanitizeSettings, settingsToConfig, toggleAllModes } from "./core/pluginConfig";
import type { HighlightColor } from "./core/highlightColors";
import type { Translator } from "./core/i18n";
import { createTranslator, resolveLanguage } from "./core/i18n";
import { toggleHighlight } from "./core/toggleHighlight";
import { livePreviewExtension, refreshMarkersEffect } from "./integrations/LivePreview";
import type { MarkerSection, ReadingModeHost } from "./integrations/ReadingMode";
import { createPostProcessor } from "./integrations/ReadingMode";
import { RealHighlightsSettingTab } from "./settings";

const BODY_READING = "real-highlights-reading";
const BODY_LIVE = "real-highlights-live";

export default class RealHighlightsPlugin extends Plugin implements ReadingModeHost {
  settings!: RealHighlightsSettings;
  readonly cache = new RenderCache(1500);
  readonly sections = new Set<MarkerSection>();
  /** Oberflächensprache folgt der Obsidian-Sprache (Englisch als Standard). */
  readonly i18n: Translator = createTranslator(resolveLanguage(appLanguage()));

  async onload(): Promise<void> {
    this.settings = sanitizeSettings(await this.loadData());

    this.addSettingTab(new RealHighlightsSettingTab(this.app, this));
    this.registerMarkdownPostProcessor(createPostProcessor(this));
    this.registerEditorExtension(
      livePreviewExtension({ cache: this.cache, config: (view, color) => this.livePreviewConfig(view, color) }),
    );

    // Theme-/CSS-Wechsel (Light/Dark, Schriftgröße) -> neu zeichnen.
    this.registerEvent(this.app.workspace.on("css-change", () => this.refresh()));

    this.addCommand({
      id: "toggle-highlight",
      name: this.i18n.t("command.toggleHighlight"),
      editorCallback: (editor: Editor) => toggleHighlight(editor),
    });
    this.addCommand({
      id: "toggle-realistic-highlights",
      name: this.i18n.t("command.toggleModes"),
      callback: () => void this.updateSettings(toggleAllModes(this.settings)),
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
        if (!editor.somethingSelected()) return;
        menu.addItem((item) =>
          item
            .setTitle(this.i18n.t("command.toggleHighlight"))
            .setIcon("highlighter")
            .onClick(() => toggleHighlight(editor)),
        );
      }),
    );

    this.applyBodyClasses();
    this.app.workspace.onLayoutReady(() => this.refresh());
  }

  onunload(): void {
    document.body.classList.remove(BODY_READING, BODY_LIVE);
    // Sektionen gehören den Ansichten, nicht dem Plugin -> eigene Ebenen explizit entfernen.
    for (const section of [...this.sections]) section.unload();
    this.sections.clear();
    this.cache.cache.clear();
  }

  async updateSettings(patch: Partial<RealHighlightsSettings>): Promise<void> {
    this.settings = sanitizeSettings({ ...this.settings, ...patch });
    await this.saveData(this.settings);
    this.refresh();
  }

  readingConfig(color: HighlightColor | null): MarkerConfig | null {
    const s = this.settings;
    return s.readingMode ? settingsToConfig(s, currentTheme(), color) : null;
  }

  private livePreviewConfig(view: EditorView, color: HighlightColor | null): MarkerConfig | null {
    const s = this.settings;
    if (!s.livePreview) return null;
    // Nur im Live Preview, nicht im Source Mode.
    if (!view.state.field(editorLivePreviewField, false)) return null;
    return settingsToConfig(s, currentTheme(), color);
  }

  private applyBodyClasses(): void {
    const s = this.settings;
    document.body.classList.toggle(BODY_READING, s.readingMode);
    document.body.classList.toggle(BODY_LIVE, s.livePreview);
  }

  /** Alle Ansichten neu zeichnen (Einstellungen, Theme). */
  refresh(): void {
    this.applyBodyClasses();
    for (const section of this.sections) section.schedule();
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!(leaf.view instanceof MarkdownView)) return;
      // Obsidian stellt die CodeMirror-Instanz intern unter editor.cm bereit.
      const cm = (leaf.view.editor as unknown as { cm?: EditorView }).cm;
      cm?.dispatch({ effects: refreshMarkersEffect.of(null) });
    });
  }
}

/** Obsidian-Sprache: getLanguage() (ab 1.8.7), sonst Fallback auf localStorage/HTML-Attribut. */
function appLanguage(): string {
  const getLanguage = (obsidian as unknown as { getLanguage?: () => string }).getLanguage;
  if (typeof getLanguage === "function") return getLanguage();
  return window.localStorage.getItem("language") ?? document.documentElement.lang ?? "en";
}
