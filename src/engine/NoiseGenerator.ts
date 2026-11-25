import { hashInt } from "./SeededRandom";

/**
 * Eindimensionales, geglättetes Value Noise.
 *
 * Die Gitterwerte werden direkt aus (seed, index) gehasht und nicht in einer
 * Tabelle vorberechnet. Dadurch ist das Noise für beliebige Koordinaten
 * definiert und ein längerer Strich "sieht weiter" in dasselbe Noise hinein,
 * anstatt einen kurzen Strich zu strecken.
 */
export class NoiseGenerator {
  constructor(private readonly seed: number) {}

  /** Gitterwert in [-1, 1]. */
  private lattice(i: number): number {
    return (hashInt(this.seed, i) / 4294967295) * 2 - 1;
  }

  /** Value Noise mit quintischer Interpolation (C2-stetig), Bereich [-1, 1]. */
  value(x: number): number {
    const i = Math.floor(x);
    const f = x - i;
    const t = f * f * f * (f * (f * 6 - 15) + 10);
    const a = this.lattice(i);
    const b = this.lattice(i + 1);
    return a + (b - a) * t;
  }

  /**
   * Fractal Brownian Motion: Summe mehrerer Oktaven, normalisiert auf [-1, 1].
   * @param x Koordinate in "Wellenlängen" der Grundfrequenz.
   */
  fbm(x: number, octaves = 3, lacunarity = 2, gain = 0.5): number {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let freq = 1;
    for (let o = 0; o < octaves; o++) {
      // Versatz pro Oktave verhindert, dass alle Oktaven bei x=0 gemeinsam auf einem Gitterpunkt liegen.
      sum += amp * this.value(x * freq + o * 17.31);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
}
