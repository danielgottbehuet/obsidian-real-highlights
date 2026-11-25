import { NoiseGenerator } from "./NoiseGenerator";
import { deriveSeed } from "./SeededRandom";

/**
 * Simuliert den variierenden Anpressdruck entlang eines Strichs.
 *
 * Der Druck ist ein niederfrequentes, geglättetes Signal in [-1, 1]. Er wirkt
 * auf Strichhöhe, Farbintensität und Sichtbarkeit der Fasern. Die Frequenz ist
 * relativ zur Strichhöhe definiert und damit unabhängig von der Strichlänge.
 */
export class PressureModel {
  private readonly noise: NoiseGenerator;
  /** Wellenlänge der Druckänderungen in px. */
  private readonly wavelength: number;

  constructor(seed: number, strokeHeight: number, readonly variation: number) {
    this.noise = new NoiseGenerator(deriveSeed(seed, "pressure"));
    this.wavelength = Math.max(1, strokeHeight * 4.5);
  }

  /** Rohes Drucksignal in [-1, 1]. */
  raw(x: number): number {
    return this.noise.fbm(x / this.wavelength, 2, 2.3, 0.45);
  }

  /** Mit der Variation gewichteter Druck in [-variation, variation]. */
  at(x: number): number {
    return this.raw(x) * this.variation;
  }
}
