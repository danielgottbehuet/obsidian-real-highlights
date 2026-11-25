import type { MarkerConfig, MarkerLayers, PositionedMarker } from "../../engine";
import type { RenderCache } from "../../shared/RenderCache";
import { measureLines } from "../../shared/TextMeasurement";

export interface MarkResolution {
  config: MarkerConfig;
  seed?: number;
}

export interface OverlaySettings {
  layers: Partial<MarkerLayers>;
  debug: boolean;
  /** "realistic" rendert SVG-Striche, "classic" zeigt die CSS-Rechteckmarkierung. */
  mode: "realistic" | "classic";
}

export interface MarkInfo {
  element: HTMLElement;
  text: string;
  baseSeed: number;
  lines: PositionedMarker[];
}

export interface RenderReport {
  marks: MarkInfo[];
  lineCount: number;
  ms: number;
}

let instanceCounter = 0;

/**
 * Integrationsschicht für den Playground: findet <mark>-Elemente in einem
 * Container, misst ihre visuellen Zeilen und legt die generierten SVG-Striche
 * in eine Ebene hinter den Text.
 *
 * Wichtig für Multiply: Die Overlay-Ebene erzeugt keinen eigenen Stacking
 * Context (kein z-index/opacity/transform), damit die SVGs mit dem Hintergrund
 * des Containers (isolation: isolate) verrechnet werden.
 */
export class MarkerOverlay {
  readonly layer: HTMLDivElement;
  private readonly id = ++instanceCounter;
  private frame = 0;
  private readonly resizeObserver: ResizeObserver;
  private readonly mutationObserver: MutationObserver;
  last: RenderReport = { marks: [], lineCount: 0, ms: 0 };
  onRender?: (report: RenderReport) => void;

  constructor(
    readonly root: HTMLElement,
    readonly content: HTMLElement,
    private readonly cache: RenderCache,
    private readonly resolve: (mark: HTMLElement, index: number) => MarkResolution,
    private readonly settings: () => OverlaySettings,
  ) {
    root.classList.add("rm-root");
    this.layer = document.createElement("div");
    this.layer.className = "rm-layer";
    this.layer.setAttribute("aria-hidden", "true");
    root.insertBefore(this.layer, root.firstChild);

    this.resizeObserver = new ResizeObserver(() => this.schedule());
    this.resizeObserver.observe(root);
    this.resizeObserver.observe(content);
    this.mutationObserver = new MutationObserver(() => this.schedule());
    this.mutationObserver.observe(content, { subtree: true, childList: true, characterData: true, attributes: true });
    document.fonts?.ready.then(() => this.schedule());
    this.schedule();
  }

  /** Bündelt mehrere Änderungen in einem Animation Frame. */
  schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  render(): RenderReport {
    const t0 = performance.now();
    const settings = this.settings();
    this.root.dataset.rmMode = settings.mode;
    const marks = Array.from(this.content.querySelectorAll<HTMLElement>("mark"));
    const infos: MarkInfo[] = [];
    let html = "";
    let lineCount = 0;

    if (settings.mode === "realistic") {
      // Erst alle Messungen (Layout lesen), dann einmalig schreiben.
      const measured = marks.map((m) => ({ m, lines: measureLines(m, this.root) }));
      measured.forEach(({ m, lines }, i) => {
        const text = m.textContent ?? "";
        const res = this.resolve(m, i);
        // Jede visuelle Zeile erhält einen eigenen Strich (Seed: hash(baseSeed:lineIndex)).
        const markers: PositionedMarker[] = lines.map((line, lineIndex) => {
          const r = this.cache.generate({
            ...res.config,
            text,
            width: line.width,
            height: line.height,
            lineIndex,
            seed: res.seed,
            layers: settings.layers,
            debug: settings.debug,
            idPrefix: `rm${this.id}-${i}-${lineIndex}`,
          });
          return { ...r, lineIndex, x: Math.round((line.x + r.offsetX) * 100) / 100, y: Math.round((line.y + r.offsetY) * 100) / 100 };
        });
        for (const mk of markers) {
          html += `<div class="rm-line" style="left:${mk.x}px;top:${mk.y}px;width:${mk.width}px;height:${mk.height}px">${mk.svg}</div>`;
        }
        lineCount += markers.length;
        infos.push({ element: m, text, baseSeed: markers[0]?.baseSeed ?? 0, lines: markers });
      });
    }

    this.layer.innerHTML = html;
    const report = { marks: infos, lineCount, ms: performance.now() - t0 };
    this.last = report;
    this.onRender?.(report);
    return report;
  }

  /** Alle Striche als ein zusammengesetztes SVG (Containerkoordinaten). */
  exportSvg(): string {
    const w = Math.ceil(this.root.scrollWidth);
    const h = Math.ceil(this.root.scrollHeight);
    const parts = this.last.marks.flatMap((m) =>
      m.lines.map((l) => l.svg.replace("<svg ", `<svg x="${l.x}" y="${l.y}" `)),
    );
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
      `<!-- RealMarker export: ${this.last.lineCount} Striche -->\n${parts.join("\n")}\n</svg>\n`
    );
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.mutationObserver.disconnect();
    this.layer.remove();
  }
}
