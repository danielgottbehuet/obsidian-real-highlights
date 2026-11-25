# Entwicklung (Real Highlights)

*(Arbeitstitel: RealMarker)*

Realistische, deterministisch generierte Textmarker-Striche als SVG – zunächst als eigenständiger **Marker Playground** (Phase 1), später als Obsidian-Plugin (Phase 2).

Die vollständige Spezifikation steht in [PROJECT.md](../PROJECT.md).

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
| `npm run build:plugin` | Obsidian-Plugin nach `dist/obsidian` bauen      |
| `npm run dev:plugin`   | Plugin im Watch-Modus bauen                     |
| `npm run link:vault`   | Plugin per Symlink in `test-vault/` einbinden   |

Seiten im Playground:

- `/` – **Playground**: editierbarer Text, Parameter, Presets, Vergleiche, Export.
- `/lab.html` – **Stroke Lab**: große Einzelstriche aller Presets zur Detailbewertung (Kanten, Keilspitze, Fasern).
- `/obsidian-harness.html` – **Obsidian-Testaufbau**: Live-Preview-Layer in echtem CodeMirror 6 und Reading-Mode-Logik ohne Obsidian.

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

Details: [docs/architecture.md](architecture.md) (Module, Schnittstellen, Integration), [docs/rendering.md](rendering.md) (Rendering-Verfahren, Parameter, Entscheidungen, bekannte Einschränkungen) und [docs/obsidian.md](obsidian.md) (Plugin, Installation, Integration).

## Projektstruktur

```text
src/engine/        DOM-unabhängige Rendering-Engine (Kern für Phase 2)
src/shared/        Integrationsschicht: TextMeasurement (DOM), RenderCache (LRU)
src/playground/    Playground (index.html, lab.html, obsidian-harness.html, components/)
src/obsidian/      Obsidian-Plugin „Real Highlights“ (main.ts, settings.ts, core/, integrations/, styles.css)
manifest.json      Plugin-Manifest (ID real-highlights), dazu versions.json
test-vault/        Demo-Vault zum Testen des Plugins
tests/             Vitest: Determinismus, Geometrie, Noise, Renderer, Plugin (tests/obsidian)
docs/              Architektur- und Rendering-Dokumentation
```

## Status

- **Phase 1** (Engine + Playground): abgeschlossen, visuell freigegeben.
- **Phase 2** (Obsidian-Plugin): Reading Mode, Live Preview, Einstellungen und Befehle umgesetzt und in Obsidian 1.13.7 und 1.15.1 geprüft – siehe [docs/obsidian.md](obsidian.md).
