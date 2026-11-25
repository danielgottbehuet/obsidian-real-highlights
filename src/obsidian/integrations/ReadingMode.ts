/**
 * Reading-Mode-Integration über einen Markdown Post Processor.
 *
 * Jede gerenderte Sektion mit <mark>-Elementen erhält ein MarkerSection-Kind.
 * Es misst erst, wenn die Sektion tatsächlich im Layout ist (ResizeObserver),
 * bündelt Aktualisierungen in einem Animation Frame und räumt beim Entladen
 * Ebenen und Observer vollständig auf.
 */
import type { MarkdownPostProcessorContext } from "obsidian";
import { MarkdownRenderChild } from "obsidian";
import type { MarkerConfig } from "../../engine";
import type { HighlightColor } from "../core/highlightColors";
import { markColor } from "../core/highlightColors";
import type { RenderCache } from "../../shared/RenderCache";
import { LAYER_CLASS, ROOT_CLASS, clearLayer, nextInstanceId, renderMarks, wrapColorEmoji } from "../core/markLayer";

export interface ReadingModeHost {
  cache: RenderCache;
  /** null = Reading Mode deaktiviert. */
  readingConfig(color: HighlightColor | null): MarkerConfig | null;
  sections: Set<MarkerSection>;
}

export class MarkerSection extends MarkdownRenderChild {
  private frame = 0;
  private observer: ResizeObserver | null = null;
  private readonly id = nextInstanceId();

  constructor(
    containerEl: HTMLElement,
    private readonly host: ReadingModeHost,
  ) {
    super(containerEl);
  }

  onload(): void {
    this.host.sections.add(this);
    this.observer = new ResizeObserver(() => this.schedule());
    this.observer.observe(this.containerEl);
    this.containerEl.ownerDocument.fonts?.ready.then(() => this.schedule());
    this.schedule();
  }

  onunload(): void {
    this.host.sections.delete(this);
    this.observer?.disconnect();
    this.observer = null;
    this.cancel();
    this.clear();
  }

  schedule(): void {
    if (this.frame) return;
    const win = this.containerEl.ownerDocument.defaultView ?? window;
    this.frame = win.requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  private cancel(): void {
    if (!this.frame) return;
    (this.containerEl.ownerDocument.defaultView ?? window).cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private clear(): void {
    const el = this.containerEl;
    el.querySelectorAll<HTMLElement>(`.${ROOT_CLASS}`).forEach(clearLayer);
    if (el.classList.contains(ROOT_CLASS)) clearLayer(el);
  }

  render(): void {
    const el = this.containerEl;
    const config = this.host.readingConfig(null);
    // Nicht sichtbar/angehängt -> später erneut (ResizeObserver meldet sich).
    if (!config || !el.isConnected || el.offsetWidth === 0) {
      if (!config) this.clear();
      return;
    }
    const marks = Array.from(el.querySelectorAll<HTMLElement>("mark")).filter(
      (m) => !m.closest(`.${LAYER_CLASS}`),
    );
    marks.forEach(wrapColorEmoji);
    renderMarks(el, marks, {
      cache: this.host.cache,
      config: (m) => this.host.readingConfig(markColor(m)) ?? config,
      idPrefix: `rmr${this.id}`,
    });
  }
}

export function createPostProcessor(host: ReadingModeHost) {
  return (el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
    if (!el.querySelector("mark")) return;
    ctx.addChild(new MarkerSection(el, host));
  };
}
