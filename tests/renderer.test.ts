import { describe, expect, it } from "vitest";
import { MARKER_PRESETS, generateMarker, generateMarkerLines, presetConfig, adaptConfigForTheme } from "../src/engine";
import { assertValidSvg } from "./helpers";

describe("SVG-Renderer", () => {
  it("enthält alle Ebenen und eindeutige IDs", () => {
    const r = generateMarker({ text: "Test", width: 100, height: 20, idPrefix: "x1" });
    assertValidSvg(r.svg);
    for (const id of ["x1-c", "x1-g", "x1-m", "x1-f"]) expect(r.svg).toContain(`id="${id}"`);
    expect(r.svg).toContain("feTurbulence");
    expect(r.svg).toContain("mix-blend-mode:multiply");
  });

  it("Ebenen lassen sich abschalten", () => {
    const r = generateMarker({
      text: "Test",
      width: 100,
      height: 20,
      layers: { fibers: false, grain: false, edges: false },
    });
    expect(r.svg).not.toContain("feTurbulence");
    expect(r.stats.fiberPaths).toBe(0);
  });

  it("Debug-Modus zeigt Kontrollpunkte", () => {
    const r = generateMarker({ text: "Test", width: 100, height: 20, debug: true });
    expect(r.svg).toContain("rm-debug");
    expect((r.svg.match(/<circle/g) ?? []).length).toBe(r.stats.controlPoints);
  });

  it("alle Presets erzeugen gültige, unterschiedliche SVGs", () => {
    const outputs = MARKER_PRESETS.map((p) =>
      generateMarker({ text: "Preset", width: 200, height: 22, ...presetConfig(p.id) }).svg,
    );
    outputs.forEach(assertValidSvg);
    expect(new Set(outputs).size).toBe(MARKER_PRESETS.length);
  });

  it("Dark-Mode-Strategie nutzt normale Überblendung mit reduzierter Deckkraft", () => {
    const light = presetConfig("classic");
    const dark = adaptConfigForTheme(light, "dark");
    expect(dark.blendMode).toBe("normal");
    expect(dark.opacity).toBeLessThan(light.opacity);
    expect(adaptConfigForTheme(light, "light")).toBe(light);
  });

  it("mehrzeilige Passagen erhalten pro Zeile einen eigenen Strich", () => {
    const lines = [
      { x: 40, y: 0, width: 300, height: 22 },
      { x: 0, y: 30, width: 340, height: 22 },
      { x: 0, y: 60, width: 120, height: 22 },
    ];
    const res = generateMarkerLines("Eine lange Passage über drei Zeilen", lines, { idPrefix: "m" });
    expect(res).toHaveLength(3);
    expect(new Set(res.map((r) => r.seed)).size).toBe(3);
    expect(new Set(res.map((r) => r.baseSeed)).size).toBe(1);
    res.forEach((r) => assertValidSvg(r.svg));
    // IDs pro Zeile eindeutig.
    expect(res[0].svg).toContain('id="m-0-m"');
    expect(res[1].svg).toContain('id="m-1-m"');
    // Gleiche Layoutbedingungen -> identische Striche.
    const again = generateMarkerLines("Eine lange Passage über drei Zeilen", lines, { idPrefix: "m" });
    expect(again.map((r) => r.svg)).toEqual(res.map((r) => r.svg));
  });
});

describe("Performance (Messung, keine harte Schwelle)", () => {
  it("misst die Generierungsdauer für verschiedene Längen", () => {
    const results: string[] = [];
    for (const width of [50, 300, 1000, 3000]) {
      const n = 50;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) generateMarker({ text: "perf", width, height: 22, seed: i });
      const ms = (performance.now() - t0) / n;
      results.push(`${width}px: ${ms.toFixed(3)} ms/Strich`);
    }
    console.log("Generierungsdauer\n  " + results.join("\n  "));
    expect(results).toHaveLength(4);
  });
});
