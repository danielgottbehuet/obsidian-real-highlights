# Entwicklung (Real Highlights)

*(Arbeitstitel: RealMarker)*

Realistische, deterministisch generierte Textmarker-Striche als SVG: Rendering-Engine (Phase 1) und Obsidian-Plugin (Phase 2). Playground und Website liegen im Repo [real-highlights-site](https://github.com/danielgottbehuet/real-highlights-site).

Die vollständige Spezifikation steht in [PROJECT.md](../PROJECT.md).

## Schnellstart

```bash
npm install
npm test            # alle Tests
npm run build       # Typecheck + Plugin-Build nach dist/obsidian
```

| Befehl                 | Zweck                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `npm run build`        | Typecheck + Plugin-Build (`main.js`, `manifest.json`, `styles.css`) |
| `npm run dev:plugin`   | Plugin im Watch-Modus bauen                                  |
| `npm run lint`         | ESLint mit den Regeln des Obsidian-Community-Scanners        |
| `npm test`             | Alle automatisierten Tests (Vitest) ausführen                |
| `npm run typecheck`    | TypeScript-Prüfung ohne Ausgabe                              |
| `npm run dev:harness`  | CodeMirror-Testaufbau (`tests/harness`) auf http://localhost:5173 |
| `npm run link:vault`   | Plugin per Symlink in `test-vault/` einbinden                |

## Website und Playground

Landingpage, Playground und Stroke Lab liegen im eigenen Repo [real-highlights-site](https://github.com/danielgottbehuet/real-highlights-site) (https://danielgottbehuet.github.io/real-highlights-site/). Sie binden die Engine dieses Repos als Abhängigkeit ein, festgelegt auf einen Release-Tag (`"real-highlights": "github:danielgottbehuet/obsidian-real-highlights#<tag>"`). Nach einer Engine-Änderung dort den Tag anheben.

Grund für die Trennung: Obsidians Community-Scanner prüft jeden Quellcode im Plugin-Repo. Website und Playground sind Browser-Seiten, für die Obsidians Plugin-Regeln (`activeDocument`, `createEl` …) nicht gelten.

## Engine verwenden

Die Engine (`src/engine`) hat keine Abhängigkeiten zu DOM, Obsidian oder Oberfläche:

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
src/obsidian/      Obsidian-Plugin „Real Highlights“ (main.ts, settings.ts, core/, integrations/)
styles.css         Plugin-Stylesheet (wie manifest.json im Hauptordner)
manifest.json      Plugin-Manifest (ID real-highlights), dazu versions.json
test-vault/        Demo-Vault zum Testen des Plugins
tests/             Vitest: Determinismus, Geometrie, Noise, Renderer, Plugin (tests/obsidian);
                   CodeMirror-Testaufbau in tests/harness
docs/              Architektur- und Rendering-Dokumentation
```

## Status

- **Phase 1** (Engine + Playground): abgeschlossen, visuell freigegeben.
- **Phase 2** (Obsidian-Plugin): Reading Mode, Live Preview, Einstellungen und Befehle umgesetzt und in Obsidian 1.13.7 und 1.15.1 geprüft – siehe [docs/obsidian.md](obsidian.md).
