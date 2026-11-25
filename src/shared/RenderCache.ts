import type { MarkerOptions } from "../engine/MarkerOptions";
import type { MarkerResult } from "../engine/MarkerEngine";
import { computeCacheKey, generateMarker, resolveInput } from "../engine/MarkerEngine";

/** Einfacher LRU-Cache auf Basis der Einfügereihenfolge einer Map. */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();
  hits = 0;
  misses = 0;

  constructor(readonly maxSize = 500) {}

  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    // Als zuletzt verwendet markieren.
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value as K;
      this.map.delete(oldest);
    }
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/** Platzhalter für SVG-IDs im Cache; wird beim Abruf durch das echte Präfix ersetzt. */
const ID_PLACEHOLDER = "rmCACHEID";

/**
 * Markergenerierung mit LRU-Cache. Der Cache-Key enthält alle renderrelevanten
 * Parameter und die Algorithmusversion. SVG-IDs werden pro Abruf eindeutig gesetzt,
 * damit mehrere identische Markierungen in einem Dokument nicht kollidieren.
 */
export class RenderCache {
  readonly cache: LruCache<string, MarkerResult>;

  constructor(maxSize = 500) {
    this.cache = new LruCache(maxSize);
  }

  generate(options: MarkerOptions): MarkerResult {
    const key = computeCacheKey(resolveInput(options));
    let res = this.cache.get(key);
    if (!res) {
      res = generateMarker({ ...options, idPrefix: ID_PLACEHOLDER });
      this.cache.set(key, res);
    }
    const prefix = options.idPrefix ?? `rm-${key}`;
    return { ...res, svg: res.svg.split(ID_PLACEHOLDER).join(prefix) };
  }
}
