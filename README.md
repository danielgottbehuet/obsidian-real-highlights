# RealMarker

Realistische, deterministisch generierte Textmarker-Striche als SVG – zunächst als eigenständiger **Marker Playground** (Phase 1), später als Obsidian-Plugin (Phase 2).

Die vollständige Spezifikation steht in [PROJECT.md](PROJECT.md).

## Schnellstart

```bash
npm install
npm run dev        # Playground auf http://localhost:5173
```

| Befehl              | Zweck                                              |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Playground mit Hot Reload starten                  |
| `npm test`          | Alle automatisierten Tests (Vitest) ausführen      |
| `npm run typecheck` | TypeScript-Prüfung ohne Ausgabe                    |
| `npm run build`     | Typecheck + statischer Build nach `dist/playground`|
| `npm run preview`   | Gebauten Playground lokal ausliefern               |

Seiten im Playground:

- `/` – **Playground**: editierbarer Text, Parameter, Presets, Vergleiche, Export.
- `/lab.html` – **Stroke Lab**: große Einzelstriche aller Presets zur Detailbewertung (Kanten, Keilspitze, Fasern).

## Playground bedienen

- Text in der Vorschau ist frei editierbar. Text auswählen → **Markieren** (oder ⌘/Ctrl + ⇧ + H), **Entfernen** hebt Markierungen in der Auswahl auf.
- Linke Leiste: Preset, Farbe (6 Standardfarben + eigene), Blend Mode, alle Rendering-Parameter, Seed-Steuerung, Ebenen/Debug, Export/Import.
- Toolbar: Schriftart, Schriftgröße, Containerbreite, Realistisch/Klassisch, Light/Dark, Generierungsdauer.
- Tabelle unter der Vorschau: Länge, Basis-Seed, Zeilenanzahl und Zeilen-Seeds jeder Markierung.
- Darunter: Klassisch vs. realistisch, alle Presets, alle Farben, kurze/lange/mehrzeilige Markierungen.
- Einstellungen und Vorschautext werden im `localStorage` gespeichert. **Standardwerte** setzt die Marker-Parameter zurück.

## Engine verwenden

Die Engine (`src/engine`) hat keine Abhängigkeiten zu DOM, Obsidian oder Playground:

```ts
import { generateMarker, presetConfig } from "./src/engine";

const result = generateMarker({
  text: "markierter Text",   // bestimmt den Seed
  width: 182.4,              // gemessene Breite der Zeile (px)
  height: 24,                // gemessene Höhe der Zeile (px)
  ...presetConfig("classic", "#ffe81a"),
  lineIndex: 0,
  idPrefix: "rm-42-0",       // eindeutige SVG-IDs im Dokument
});

// result.svg an Position (zeileX + result.offsetX, zeileY + result.offsetY) hinter den Text legen.
```

Details: [docs/architecture.md](docs/architecture.md) (Module, Schnittstellen, Integration) und [docs/rendering.md](docs/rendering.md) (Rendering-Verfahren, Parameter, Entscheidungen, bekannte Einschränkungen).

## Projektstruktur

```text
src/engine/        DOM-unabhängige Rendering-Engine (Kern für Phase 2)
src/shared/        Integrationsschicht: TextMeasurement (DOM), RenderCache (LRU)
src/playground/    Playground (index.html, lab.html, main.ts, components/)
tests/             Vitest: Determinismus, Geometrie, Noise, Renderer
docs/              Architektur- und Rendering-Dokumentation
```

## Status

Phase 1 ist technisch umgesetzt und bereit zur visuellen Evaluation. Die Obsidian-Integration (Phase 2) beginnt erst nach Freigabe.
