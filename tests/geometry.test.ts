import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, PARAM_SPECS, computeStrokeGeometry, generateMarker, normalizeConfig } from "../src/engine";
import { mergeLineRects } from "../src/shared/TextMeasurement";
import { assertValidSvg } from "./helpers";

describe("Geometrie", () => {
  it("sehr kurze Texte und einzelne Zeichen", () => {
    for (const [text, width] of [["a", 7], ["i", 2], ["§", 9]] as const) {
      const r = generateMarker({ text, width, height: 20 });
      assertValidSvg(r.svg);
      expect(r.width).toBeGreaterThan(width);
    }
  });

  it("sehr lange Texte", () => {
    const text = "lang ".repeat(400);
    const r = generateMarker({ text, width: 5000, height: 22 });
    assertValidSvg(r.svg);
    expect(r.width).toBeGreaterThan(5000);
  });

  it("leere Texte und Breite 0 erzeugen gültige SVGs", () => {
    assertValidSvg(generateMarker({ text: "", width: 0, height: 20 }).svg);
    assertValidSvg(generateMarker({ text: "", width: 100, height: 20 }).svg);
  });

  it("Unicode-Zeichen und Emojis", () => {
    for (const text of ["😀", "👩‍💻 Code", "Ä Ö Ü ß", "日本語のテキスト", "\u0000￿"]) {
      const r = generateMarker({ text, width: 80, height: 20 });
      assertValidSvg(r.svg);
    }
  });

  it("ungültige Eingabewerte werden abgefangen", () => {
    const bad = [
      { width: NaN, height: NaN },
      { width: -100, height: -5 },
      { width: Infinity, height: Infinity },
      { width: 100, height: 20, opacity: NaN, roughness: -4, tipAngle: 500, color: "javascript:alert(1)" },
      { width: 100, height: 20, seed: NaN, lineIndex: -3 },
    ];
    for (const b of bad) {
      const r = generateMarker({ text: "x", ...(b as object) } as never);
      assertValidSvg(r.svg);
      expect(r.svg).not.toContain("javascript");
    }
  });

  it("extreme Parameterwerte erzeugen keine ungültige Geometrie", () => {
    const extremes = [0, 1].map((t) =>
      Object.fromEntries(PARAM_SPECS.map((s) => [s.key, t === 0 ? s.min : s.max])),
    );
    for (const cfg of extremes) {
      for (const [width, height] of [[1, 1], [50, 12], [900, 80]]) {
        const r = generateMarker({ text: "Extrem", width, height, ...cfg });
        assertValidSvg(r.svg);
        expect(r.width).toBeGreaterThan(0);
        expect(r.height).toBeGreaterThan(0);
      }
    }
  });

  it("unterschiedliche Schriftgrößen und Strichhöhen skalieren die Strichhöhe", () => {
    const small = generateMarker({ text: "x", width: 100, height: 14 });
    const big = generateMarker({ text: "x", width: 100, height: 40 });
    expect(big.stats.strokeHeight).toBeGreaterThan(small.stats.strokeHeight * 2.5);
    const thin = generateMarker({ text: "x", width: 100, height: 20, strokeHeight: 0.5 });
    expect(thin.stats.strokeHeight).toBeCloseTo(10, 5);
  });

  it("Kontrollpunkte wachsen mit der Strichlänge (kein Strecken)", () => {
    const cfg = normalizeConfig(DEFAULT_CONFIG);
    const short = computeStrokeGeometry(1, 50, 20, cfg);
    const long = computeStrokeGeometry(1, 1000, 20, cfg);
    expect(long.top.length).toBeGreaterThan(short.top.length * 10);
    // Abstand der Kontrollpunkte bleibt nahezu gleich.
    const spacing = (g: typeof short) => g.bottom[1].x - g.bottom[0].x;
    expect(Math.abs(spacing(long) - spacing(short))).toBeLessThan(spacing(short) * 0.5);
    expect(short.top.length).toBeGreaterThanOrEqual(4);
  });

  it("Konturen sind glatt (keine künstlichen Zacken)", () => {
    const cfg = normalizeConfig({ roughness: 1 });
    const g = computeStrokeGeometry(99, 800, 20, cfg);
    for (const edge of [g.top, g.bottom]) {
      for (let i = 1; i < edge.length - 1; i++) {
        // Zweite Ableitung (Krümmung) klein im Verhältnis zur Strichhöhe.
        const curvature = Math.abs(edge[i - 1].y - 2 * edge[i].y + edge[i + 1].y);
        expect(curvature).toBeLessThan(g.strokeHeight * 0.12);
      }
    }
  });

  it("Strich überdeckt den Textbereich inkl. Überstand", () => {
    const cfg = normalizeConfig({ overshoot: 0.3 });
    const g = computeStrokeGeometry(5, 300, 20, cfg);
    expect(g.startX).toBeLessThan(0);
    expect(g.endX).toBeGreaterThan(300);
    // Überstand bleibt begrenzt.
    expect(g.startX).toBeGreaterThan(-g.strokeHeight * 0.3 * 1.4);
    expect(g.endX).toBeLessThan(300 + g.strokeHeight * 0.3 * 1.4);
  });

  it("Strich bleibt vertikal in der Nähe der Zeile", () => {
    const cfg = normalizeConfig({ verticalDrift: 1, roughness: 1 });
    for (let s = 0; s < 50; s++) {
      const g = computeStrokeGeometry(s, 600, 20, cfg);
      for (const p of g.top) expect(p.y).toBeGreaterThan(-6);
      for (const p of g.bottom) expect(p.y).toBeLessThan(26);
    }
  });
});

describe("Mehrzeilige Markierungen", () => {
  it("führt Rechtecke derselben visuellen Zeile zusammen", () => {
    const lines = mergeLineRects([
      { left: 10, top: 0, width: 50, height: 20 },
      { left: 60, top: 1, width: 30, height: 19 }, // fett, leicht andere Höhe
      { left: 90, top: 0, width: 40, height: 20 },
      { left: 0, top: 30, width: 120, height: 20 }, // zweite Zeile
      { left: 130, top: 0, width: 0, height: 20 }, // leeres Rechteck am Umbruch
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ x: 10, y: 0, width: 120, height: 20 });
    expect(lines[1]).toEqual({ x: 0, y: 30, width: 120, height: 20 });
  });

  it("verwirft ungültige Rechtecke", () => {
    expect(mergeLineRects([{ left: NaN, top: 0, width: 10, height: 10 }])).toEqual([]);
  });
});
