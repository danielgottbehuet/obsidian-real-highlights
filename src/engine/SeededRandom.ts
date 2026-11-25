/**
 * Deterministische Hash- und Zufallsfunktionen.
 *
 * Alle Funktionen arbeiten ausschließlich mit 32-Bit-Integer-Arithmetik
 * (Math.imul, >>> 0) und sind dadurch plattform- und engineunabhängig stabil.
 * Innerhalb der Engine wird niemals Math.random() verwendet.
 */

/** FNV-1a 32 Bit über die UTF-16-Code-Units eines Strings. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    // Beide Bytes der Code-Unit einfließen lassen.
    hash ^= c & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= c >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Finaler Mischschritt (Murmur3 fmix32) – gute Bitverteilung. */
export function mix32(x: number): number {
  x = x >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Kombiniert einen Seed mit einem Integer-Index zu einem neuen 32-Bit-Wert. */
export function hashInt(seed: number, index: number): number {
  return mix32((seed ^ Math.imul(index | 0, 0x9e3779b1)) + 0x6d2b79f5);
}

/** Ableitung eines benannten Unter-Seeds (z. B. "top", "fibers"). */
export function deriveSeed(seed: number, label: string): number {
  return mix32(seed ^ fnv1a(label));
}

/** Basis-Seed einer Textpassage gemäß Spezifikation: hash(`${length}:${text}`). */
export function textSeed(text: string): number {
  return fnv1a(`${text.length}:${text}`);
}

/** Seed einer einzelnen visuellen Zeile: hash(`${baseSeed}:${lineIndex}`). */
export function lineSeed(baseSeed: number, lineIndex: number): number {
  return fnv1a(`${baseSeed >>> 0}:${lineIndex | 0}`);
}

/** Mulberry32 – kleiner, schneller, deterministischer PRNG. */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Gleichverteilt in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Gleichverteilt in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Gleichverteilt in [-1, 1). */
  signed(): number {
    return this.next() * 2 - 1;
  }

  /** Ganzzahl in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Näherungsweise normalverteilt (Summe dreier Gleichverteilungen), Bereich [-1, 1]. */
  gaussianish(): number {
    return (this.next() + this.next() + this.next()) / 1.5 - 1;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
