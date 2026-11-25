# Architektur

## Schichten

```text
┌──────────────────────────────────────────────────────────────┐
│ Playground (src/playground)          später: Obsidian-Plugin │
│   main.ts, MarkerOverlay, editorUtils, lab.ts                │
├──────────────────────────────────────────────────────────────┤
│ Integrationsschicht (src/shared)                             │
│   TextMeasurement  – DOM-Ranges → visuelle Zeilen            │
│   RenderCache      – LRU-Cache, eindeutige SVG-IDs           │
├──────────────────────────────────────────────────────────────┤
│ Engine (src/engine) – rein, DOM-frei, deterministisch        │
│   MarkerEngine → StrokeGeometry → InkTexture → SvgRenderer   │
│   SeededRandom, NoiseGenerator, PressureModel                │
│   MarkerOptions (Parameter, Normalisierung), MarkerPresets   │
└──────────────────────────────────────────────────────────────┘
```

Abhängigkeiten zeigen nur nach unten. Die Engine importiert nichts aus `shared` oder `playground` und verwendet keine Browser-APIs; sie läuft unverändert in Node (Tests) und im Browser.

## Module der Engine

| Modul | Aufgabe |
| --- | --- |
| `SeededRandom.ts` | FNV-1a-Hash, Murmur-Finalizer (`mix32`), `hashInt`, `deriveSeed`, `textSeed`, `lineSeed`, Mulberry32-PRNG. Nur 32-Bit-Integer-Arithmetik. |
| `NoiseGenerator.ts` | 1D-Value-Noise mit quintischer Interpolation und fBm. Gitterwerte werden aus `(seed, index)` gehasht → unendlich, ohne Tabelle. |
| `PressureModel.ts` | Niederfrequentes Drucksignal entlang des Strichs. |
| `StrokeGeometry.ts` | Länge, Überstand, Keilspitze, vertikale Bewegung, organische Kanten, Strichenden, Umriss (Catmull-Rom → Bézier), Bounds. |
| `InkTexture.ts` | Intensitätsverlauf (Druck + Tintenansammlung), Faserpfade, Körnungsparameter, Randverstärkung. |
| `SvgRenderer.ts` | Setzt alle Ebenen zu einem eigenständigen SVG zusammen; Debug-Ebene. |
| `MarkerOptions.ts` | Typen, `PARAM_SPECS` (Bereiche, auch für UI), Defaults, `normalizeConfig`, `stableSerialize`, `ALGORITHM_VERSION`. |
| `MarkerPresets.ts` | Presets, Farbpalette, `adaptConfigForTheme`. |
| `MarkerEngine.ts` | Öffentliche API: `generateMarker`, `generateMarkerLines`, `resolveInput`, `computeCacheKey`. |

## Öffentliche Schnittstelle

```ts
interface MarkerOptions extends Partial<MarkerConfig> {
  text: string;          // bestimmt den Basis-Seed
  width: number;         // gemessene Zeilenbreite in px
  height: number;        // gemessene Zeilenhöhe in px
  seed?: number;         // Override des Basis-Seeds
  lineIndex?: number;    // visuelle Zeile (0 = erste)
  idPrefix?: string;     // Präfix für SVG-IDs (nur IDs, keine Geometrie)
  layers?: Partial<MarkerLayers>; // base, pooling, edges, fibers, grain
  debug?: boolean;       // Kontrollpunkte, Kontur, Mittellinie
}

interface MarkerResult {
  svg: string;                  // eigenständiges SVG
  seed: number;                 // Zeilen-Seed
  baseSeed: number;             // Seed der Passage
  width: number; height: number;       // SVG-Größe
  offsetX: number; offsetY: number;    // Position relativ zur Zeilenbox
  algorithmVersion: string;
  cacheKey: string;
  stats: { controlPoints; fiberPaths; strokeHeight };
}

generateMarker(options: MarkerOptions): MarkerResult
generateMarkerLines(text, lines: LineBox[], options): PositionedMarker[]
```

`MarkerConfig` enthält die Parameter aus PROJECT.md §6.2 sowie drei dokumentierte Erweiterungen: `edgeInk`, `verticalOffset`, `blendMode`.

`generateMarker` ist eine reine Funktion: keine Seiteneffekte, kein `Math.random`, keine globalen Zustände. Ein Test ersetzt `Math.random` durch eine werfende Funktion, um das abzusichern.

### Seeds

```text
baseSeed = seedOverride ?? fnv1a(`${text.length}:${text}`)
lineSeed = fnv1a(`${baseSeed}:${lineIndex}`)
```

Unterseeds für einzelne Aspekte (`geometry`, `drift`, `edge-top`, `pressure`, `fibers` …) werden per `deriveSeed(lineSeed, label)` abgeleitet. Dadurch beeinflusst z. B. eine Änderung der Faserdichte nicht die Kontur.

Position im Dokument und umgebender Text fließen nicht ein. Geometrie hängt ab von: Seed, gemessener Breite/Höhe, Konfiguration, Algorithmusversion, Zeilenindex.

### SVG-IDs

Jeder Strich nutzt IDs `${idPrefix}-c|g|f|m` (Clip, Gradient, Filter, Maske). Ohne `idPrefix` wird `rm-${cacheKey}` verwendet. Integrationen sollten ein instanzeindeutiges Präfix übergeben (im Playground `rm{overlay}-{mark}-{line}`), damit identische Markierungen im selben Dokument nicht kollidieren. `RenderCache` speichert SVGs mit Platzhalter-ID und setzt beim Abruf das echte Präfix ein.

## Integrationsschicht

**TextMeasurement** (`measureLines(element|range, container)`): liest `Range.getClientRects()`, rechnet relativ zum Container (inkl. Border und Scroll) und führt Rechtecke derselben visuellen Zeile zusammen (`mergeLineRects`: ≥ 50 % vertikale Überlappung → gleiche Zeile; leere Rechtecke an Umbrüchen werden verworfen). Fett/kursiv/verschachtelte Inline-Elemente werden so zu einer Zeilenbox.

**RenderCache**: LRU auf `Map`-Basis. Schlüssel = `fnv1a(stableSerialize({seed, width, height, config, layers, debug, algorithmVersion}))`.

## Playground-Integration (Vorlage für Phase 2)

`MarkerOverlay` zeigt das vorgesehene Integrationsmuster:

1. Container `position: relative; isolation: isolate` (Papier).
2. Overlay-Ebene `position: absolute; inset: 0` als erstes Kind, **ohne** `z-index`/`opacity`/`transform` – sonst entstünde ein eigener Stacking Context und `mix-blend-mode: multiply` würde nicht mit dem Papier verrechnet.
3. Text-Element danach mit `position: relative` → malt über der Overlay-Ebene. `<mark>`-Hintergrund wird transparent gesetzt.
4. Aktualisierung über `ResizeObserver` (Container + Inhalt), `MutationObserver` (Textänderungen) und `document.fonts.ready`, gebündelt in einem `requestAnimationFrame`. Erst alle Messungen, dann ein einziger DOM-Schreibvorgang.
5. Kein Rendering-Loop, keine Animationen.

Für Obsidian (Phase 2) werden Reading Mode (Post Processor) und Live Preview (CodeMirror-Decorations) dieselbe Kombination aus `measureLines` + `RenderCache.generate` nutzen.
