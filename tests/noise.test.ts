import { describe, expect, it } from "vitest";
import { NoiseGenerator } from "../src/engine";

describe("NoiseGenerator", () => {
  const n = new NoiseGenerator(1234);

  it("ist deterministisch", () => {
    const m = new NoiseGenerator(1234);
    for (let x = -10; x < 10; x += 0.37) expect(n.fbm(x)).toBe(m.fbm(x));
  });

  it("bleibt im Bereich [-1, 1]", () => {
    for (let x = -500; x < 500; x += 0.173) {
      const v = n.value(x);
      const f = n.fbm(x, 4);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      expect(f).toBeGreaterThanOrEqual(-1);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("ist stetig und glatt (keine Sprünge zwischen Gitterpunkten)", () => {
    const step = 0.001;
    let maxDelta = 0;
    for (let x = 0; x < 50; x += step) maxDelta = Math.max(maxDelta, Math.abs(n.value(x + step) - n.value(x)));
    // Quintische Interpolation: max. Steigung 1.875 * 2 (Wertebereich) pro Einheit.
    expect(maxDelta).toBeLessThan(4 * step);
  });

  it("verschiedene Seeds erzeugen verschiedenes Noise", () => {
    const other = new NoiseGenerator(4321);
    let diff = 0;
    for (let x = 0; x < 20; x += 0.5) diff += Math.abs(n.value(x) - other.value(x));
    expect(diff).toBeGreaterThan(1);
  });

  it("hat keine kurzperiodischen Wiederholungen", () => {
    const a = Array.from({ length: 64 }, (_, i) => n.value(i + 0.5));
    const b = Array.from({ length: 64 }, (_, i) => n.value(i + 64.5));
    expect(a).not.toEqual(b);
  });
});
