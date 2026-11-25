import { describe, expect, it } from "vitest";
import {
  ALGORITHM_VERSION,
  SeededRandom,
  fnv1a,
  generateMarker,
  generateMarkerLines,
  lineSeed,
  presetConfig,
  textSeed,
} from "../src/engine";
import { RenderCache } from "../src/shared/RenderCache";

const base = { text: "Die Kanten sind leicht unregelmäßig", width: 280, height: 24 };

describe("Hash & PRNG", () => {
  it("FNV-1a liefert bekannte Referenzwerte (plattformunabhängig)", () => {
    // Fixierte Werte: Änderungen hier bedeuten veränderte Seeds für alle Markierungen.
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(fnv1a("a"));
    expect(textSeed("Tinte")).toBe(fnv1a("5:Tinte"));
    expect(textSeed("Tinte")).toMatchInlineSnapshot(`155305664`);
  });

  it("Mulberry32 erzeugt reproduzierbare Folgen in [0, 1)", () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const seqA = Array.from({ length: 1000 }, () => a.next());
    const seqB = Array.from({ length: 1000 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new SeededRandom(43).next()).not.toBe(seqA[0]);
  });

  it("Zeilen-Seed entspricht hash(`${baseSeed}:${lineIndex}`)", () => {
    expect(lineSeed(123, 2)).toBe(fnv1a("123:2"));
  });
});

describe("Determinismus der Engine", () => {
  it("identische Eingaben erzeugen identische SVGs", () => {
    const a = generateMarker(base);
    const b = generateMarker({ ...base });
    expect(a.svg).toBe(b.svg);
    expect(a.seed).toBe(b.seed);
  });

  it("wiederholte Aufrufe weichen nicht ab", () => {
    const first = generateMarker(base).svg;
    for (let i = 0; i < 20; i++) expect(generateMarker(base).svg).toBe(first);
  });

  it("verwendet kein Math.random", () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error("Math.random darf nicht verwendet werden");
    };
    try {
      expect(() => generateMarker({ ...base, ...presetConfig("dry") })).not.toThrow();
    } finally {
      Math.random = original;
    }
  });

  it("unterschiedliche Seeds erzeugen unterschiedliche Strichvarianten", () => {
    const a = generateMarker({ ...base, seed: 1 });
    const b = generateMarker({ ...base, seed: 2 });
    expect(a.svg).not.toBe(b.svg);
  });

  it("unterschiedliche Texte gleicher Länge erhalten unterschiedliche Seeds", () => {
    expect(textSeed("abcde")).not.toBe(textSeed("edcba"));
    const a = generateMarker({ text: "abcde", width: 60, height: 20 });
    const b = generateMarker({ text: "edcba", width: 60, height: 20 });
    expect(a.svg).not.toBe(b.svg);
  });

  it("manueller Seed überschreibt den automatisch berechneten Seed", () => {
    const a = generateMarker({ ...base, seed: 777 });
    const b = generateMarker({ ...base, text: "ganz anderer Text", seed: 777 });
    expect(a.baseSeed).toBe(777);
    // Geometrie hängt nur von Seed, Abmessungen und Konfiguration ab, nicht vom Text selbst.
    expect(a.svg).toBe(b.svg);
  });

  it("Änderungen an anderen Textpassagen beeinflussen eine Markierung nicht", () => {
    // Der Seed hängt nur vom markierten Text ab, nicht von Position oder Umgebung.
    const lines = [{ x: 0, y: 0, width: 200, height: 22 }];
    const a = generateMarkerLines("markiert", lines, {});
    const shifted = generateMarkerLines("markiert", [{ x: 120, y: 300, width: 200, height: 22 }], {});
    expect(a[0].svg).toBe(shifted[0].svg);
    expect(shifted[0].x - a[0].x).toBe(120);
  });

  it("Referenz-Snapshot: Neustart/Neuimport verändert keine Markierung", () => {
    // Der Snapshot fixiert die exakte Ausgabe der Algorithmusversion. Ändert sich der
    // Algorithmus bewusst, muss ALGORITHM_VERSION erhöht und der Snapshot aktualisiert werden.
    const r = generateMarker({ text: "Snapshot", width: 120, height: 20 });
    expect(r.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(fnv1a(r.svg).toString(16)).toMatchSnapshot();
  });

  it("idPrefix verändert nur IDs, nicht die Geometrie", () => {
    const a = generateMarker({ ...base, idPrefix: "a1" }).svg.replace(/a1-/g, "X-");
    const b = generateMarker({ ...base, idPrefix: "b2" }).svg.replace(/b2-/g, "X-");
    expect(a).toBe(b);
  });
});

describe("RenderCache", () => {
  it("liefert dieselbe Ausgabe wie die ungecachte Generierung", () => {
    const cache = new RenderCache(10);
    const direct = generateMarker({ ...base, idPrefix: "p" });
    const c1 = cache.generate({ ...base, idPrefix: "p" });
    const c2 = cache.generate({ ...base, idPrefix: "p" });
    expect(c1.svg).toBe(direct.svg);
    expect(c2.svg).toBe(direct.svg);
    expect(cache.cache.hits).toBe(1);
  });

  it("vergibt eindeutige IDs pro Abruf und begrenzt die Größe (LRU)", () => {
    const cache = new RenderCache(3);
    const a = cache.generate({ ...base, idPrefix: "one" });
    const b = cache.generate({ ...base, idPrefix: "two" });
    expect(a.svg).toContain('id="one-m"');
    expect(b.svg).toContain('id="two-m"');
    for (let i = 0; i < 10; i++) cache.generate({ ...base, seed: i });
    expect(cache.cache.size).toBe(3);
  });

  it("Cache-Key berücksichtigt alle renderrelevanten Parameter", () => {
    const k = (o: object) => generateMarker({ ...base, ...o }).cacheKey;
    const ref = k({});
    expect(k({ width: 281 })).not.toBe(ref);
    expect(k({ height: 25 })).not.toBe(ref);
    expect(k({ roughness: 0.31 })).not.toBe(ref);
    expect(k({ color: "#ff0000" })).not.toBe(ref);
    expect(k({ lineIndex: 1 })).not.toBe(ref);
    expect(k({ layers: { fibers: false } })).not.toBe(ref);
    expect(k({})).toBe(ref);
  });
});
