# Obsidian-Plugin „Real Highlights“ (Phase 2)

Plugin-ID: `real-highlights` · Name: **Real Highlights** · Projekt-Arbeitstitel war „RealMarker“. Das Manifest liegt im Wurzelverzeichnis (`manifest.json`, dazu `versions.json`), weil Obsidian es dort beim Einreichen als Community-Plugin erwartet.

## Build und Installation

```bash
npm run build:plugin     # Typecheck + Build nach dist/obsidian (main.js, manifest.json, styles.css)
npm run dev:plugin       # Watch-Modus (mit Sourcemaps)
```

Installation in einen beliebigen Vault: den Inhalt von `dist/obsidian/` nach `<Vault>/.obsidian/plugins/real-highlights/` kopieren und unter *Einstellungen → Community-Plugins* aktivieren. Alternativ beim Build direkt kopieren:

```bash
OBSIDIAN_PLUGIN_DIR="<Vault>/.obsidian/plugins/real-highlights" npm run dev:plugin
```

### Test-Vault

`test-vault/` enthält Demo-Notizen (`RealMarker Demo.md`: alle Sonderfälle; `Farben.md`: farbige Markierungen; `Performance.md`: 600 Markierungen). Das Plugin ist per Symlink eingebunden (`npm run link:vault` legt ihn nach einem frischen Clone an). In Obsidian: *Vault öffnen → Ordner als Vault öffnen → `test-vault`*, dann Community-Plugins aktivieren. Nach jedem Build: Plugin in den Einstellungen aus- und einschalten oder Obsidian neu laden. Die Plugin-Einstellungen (`data.json`) landen wegen des Symlinks in `dist/obsidian/`.

## Funktionsumfang (MVP)

- Darstellung nativer `==Markierungen==` im **Reading Mode** und im **Live Preview**. Der **Source Mode** bleibt unverändert.
- **Farbige Markierungen** nach [Obsidian-Syntax](https://obsidian.md/help/syntax#Highlight+colors): `==🔴Text==`, `==🟠Text==`, `==🟡Text==`, `==🟢Text==`, `==🔵Text==`, `==🟣Text==`. Jede Farbe hat eine eigene, einstellbare Markerfarbe. Ohne Emoji gilt die Standardfarbe.
- Die Markdown-Dateien werden nicht verändert. Nach dem Deaktivieren erscheint wieder die normale Obsidian-Markierung.
- Einstellungen mit Live-Vorschau: An/Aus je Modus (Reading Mode, Live Preview), Preset, Standardfarbe (6 Vorgaben + eigene), Markerfarben der sechs Obsidian-Farben, Deckkraft, Strichhöhe, Kantenunregelmäßigkeit, Faserstruktur, Tintenintensität, Mischmodus Light/Dark, Deckkraftfaktor Dark, Zurücksetzen.
- **Zweisprachig**: Die Oberfläche folgt der Obsidian-Sprache (`getLanguage()`): Deutsch bei deutscher Oberfläche, sonst Englisch. Ein eigener Sprachschalter ist nicht nötig. Texte in `core/i18n.ts`.
- Befehle (Tastenkürzel frei zuweisbar): *Markierung umschalten*, *Realistische Markierungen ein-/ausschalten* (schaltet beide Modi gemeinsam: ist einer aktiv, werden beide aus-, sonst beide eingeschaltet).
- Einen globalen An/Aus-Schalter gibt es bewusst nicht: Das übernimmt Obsidian unter *Community-Plugins*. Abweichung von PROJECT.md §17, dort „aktivieren oder deaktivieren“ – abgedeckt durch die Modus-Schalter und den Befehl. Gespeichertes `enabled: false` älterer Plugin-Versionen wird beim Laden auf „beide Modi aus“ migriert. *Markierung umschalten* steht auch im Editor-Kontextmenü bei markiertem Text.

## Integration

### Reading Mode – `integrations/ReadingMode.ts`

- Ein `MarkdownPostProcessor` hängt an jede Sektion mit `<mark>` ein `MarkerSection` (`MarkdownRenderChild`).
- Gemessen und gezeichnet wird erst, wenn die Sektion im Layout ist (`ResizeObserver`). Updates werden per `requestAnimationFrame` gebündelt.
- Die Striche liegen in einer Ebene (`.real-highlights-layer`, `z-index: -1`) in einem isolierten Bezugscontainer (`.real-highlights-root`). Callouts und Tabellenzellen bekommen eine eigene Ebene, damit ihr Hintergrund die Striche nicht verdeckt.
- Beim Entladen (Sektion oder Plugin) werden Ebenen, Klassen und Observer entfernt.

### Live Preview – `integrations/LivePreview.ts`

- Ein CodeMirror-6-**Layer** (`layer({ above: false })`) zeichnet hinter dem Text, dieselbe Technik wie bei der Textauswahl. Dokument-DOM, Decorations, Cursor, Auswahl und Zeilenhöhen bleiben unberührt.
- Die Highlights werden im gerenderten DOM erkannt (`.cm-highlight`, `highlightDom.ts`). Formatierungszeichen (`==`, `**` …) zählen nicht zum Text. Dadurch ist der Seed identisch zum Reading Mode und ändert sich nicht, wenn der Cursor die `==` ein- und ausblendet.
- Neu gezeichnet wird bei Dokument-, Viewport-, Auswahl- und Geometrieänderungen sowie bei `refreshMarkersEffect` (Einstellungen, Theme). Messen und Schreiben laufen im Mess-Zyklus von CodeMirror. Unveränderte Striche werden über `LayerMarker.eq` nicht neu gezeichnet, und der `RenderCache` vermeidet Neuberechnungen.
- Es werden nur die von CodeMirror gerenderten (sichtbaren) Zeilen verarbeitet.

### Farbige Markierungen – `core/highlightColors.ts`

Obsidians Doku nennt keine Mindestversion für farbige Markierungen. Getestet: **1.13.7 ohne** und **1.15.1 mit** Farbunterstützung. Die genaue Einführungsversion (1.14.x oder 1.15.x) ist unbekannt. Das Plugin prüft keine Versionsnummer, sondern erkennt beide Darstellungen am DOM.

| | mit Farbunterstützung (getestet 1.15.1) | ohne Farbunterstützung (getestet 1.13.7) |
| --- | --- | --- |
| Reading Mode | `<mark data-highlight="red">` | Emoji als Text → Farbe aus dem Emoji. Das Emoji wird in ein Span gekapselt und ausgeblendet, solange Real Highlights aktiv ist. |
| Live Preview | `span.cm-highlight.cm-highlight-red`, Emoji von Obsidian ausgeblendet | Emoji als Text → Farbe aus dem Emoji. Der Strich beginnt hinter dem Emoji, das Emoji selbst bleibt sichtbar. |

- Obsidian färbt diese Markierungen mit seinen UI-Farben (`--color-red` usw., z. B. Blau `#027aff`). Die wirken als Textmarker zu kräftig. Deshalb verwendet Real Highlights eigene Markerfarben (Standard: Rot `#ff6b6b`, Orange `#ffa63d`, Gelb `#ffe81a`, Grün `#7cf05c`, Blau `#5cc8ff`, Lila `#be95ff`), die sich einzeln einstellen lassen.
- Das Emoji zählt nicht zum Seed-Text. Ein Farbwechsel ändert nur die Farbe, nicht die Form des Strichs, und alte und neue Obsidian-Versionen erzeugen denselben Strich.
- Direkt aufeinanderfolgende Markierungen verschiedener Farbe werden im Live Preview getrennt.

### Farbverhalten

- Light: `multiply` (einstellbar).
- Dark: `normal` mit Deckkraftfaktor 0.5, gedämpften Fasern und gedämpfter Körnung (einstellbar).
- Das Theme wird über `body.theme-dark` erkannt. Bei `css-change` wird alles neu gezeichnet.

## Prüfung

- **Unit-Tests** (`tests/obsidian/`): Einstellungen (Validierung, Preset-/Theme-Abbildung), Highlight-Erkennung im Live-Preview-DOM, *Markierung umschalten*.
- **CodeMirror-Testaufbau** (`npm run dev` → `/obsidian-harness.html`): echtes CodeMirror 6 mit derselben Layer-Erweiterung. Ein kleines ViewPlugin bildet Obsidians Highlight-Darstellung nach. Daneben läuft die Reading-Mode-Logik mit Callout und Tabelle. Damit geprüft: mehrzeilige Striche, Callout/Tabelle, fett/kursiv, stabiler Seed bei eingeblendeten `==`, keine Änderung bei Bearbeitung anderer Stellen, Viewport beim Scrollen, Dark Mode, vollständiges Aufräumen beim Ausschalten.
- **In Obsidian 1.13.7 (macOS)** am 2026-11-25 mit dem Test-Vault, gesteuert über die Obsidian-CLI (`obsidian eval`):
  - Plugin lädt ohne Fehler (`dev:errors` leer).
  - Live Preview und Reading Mode, Light und Dark: alle Sonderfälle der Demo-Notiz korrekt (Überschrift, Listen, Aufgabe, Zitat, Callout, Tabelle, fett/kursiv/Code/Link, Emoji, gleicher Text, kein Highlight in Code).
  - Die Annahme über Obsidians Live-Preview-Klassen (`cm-highlight`, `cm-formatting-highlight`) ist bestätigt.
  - Seeds sind zwischen Live Preview und Reading Mode identisch. Abweichungen gibt es nur bei anderem Zeilenumbruch, und das ist so gewollt.
  - `Performance.md` (600 Markierungen): Im Viewport werden nur die sichtbaren Markierungen gezeichnet, Tippen kostet etwa einen Frame, beim Scrollen werden die Striche nachgezeichnet.
  - Einstellungen: Tab mit Vorschau rendert, Farbwechsel wirkt sofort, Ausschalten stellt die native Markierung wieder her.
  - **Obsidian 1.15.1** (nach Update): farbige Markierungen (`Farben.md`) in Live Preview und Reading Mode korrekt, Striche und Farben in beiden Modi identisch, geänderte Palettenfarbe wirkt sofort, Demo-Notiz weiterhin fehlerfrei.
  - Nicht geprüft: farbige Markierungen ohne Farbunterstützung (1.13.7) mit dem aktuellen Plugin in Obsidian selbst (nur per Unit-Test), Einstellungsdialog per Klick (ließ sich aus der CLI nicht öffnen; der Tab-Inhalt wurde separat gerendert), Befehle per Tastenkürzel, Kontextmenü, Mobile.

## Bekannte Einschränkungen und offene Punkte

- **minAppVersion 1.8.7** wegen `getLanguage()`. Getestet sind nur 1.13.7 und 1.15.1.
- **Englische Oberfläche** ist per Unit-Test geprüft, in Obsidian selbst wurde nur die deutsche angesehen (die App läuft auf Deutsch).

- **Abhängigkeit von Obsidians DOM** (in 1.13.7 und 1.15.1 bestätigt): Live Preview erwartet die Klassen `cm-highlight`, `cm-formatting` und `cm-formatting-highlight`, für Farben `cm-highlight-<farbe>`; Reading Mode `mark[data-highlight]`. Ändert Obsidian diese Klassen, werden im Live Preview keine Striche gezeichnet, und es erscheint wieder die native Markierung. Das Plugin fällt also ohne Fehler auf die Standardanzeige zurück.
- **`editor.cm`** ist keine offizielle API. Fehlt sie, greift die Aktualisierung über Einstellungsänderungen im Live Preview erst beim nächsten Editor-Update.
- **Seeds bei Links**: Reading Mode nutzt den angezeigten Text (`[[Ziel|Alias]]` → „Alias“), Live Preview den sichtbaren Editortext. Bei Links, deren Anzeige sich zwischen den Modi unterscheidet, können die Striche voneinander abweichen.
- **Mehrzeilige Highlights im Quelltext** (`==` über einen harten Zeilenumbruch): Im Reading Mode funktioniert das, im Live Preview hängt es davon ab, wie Obsidian die Zeilen auszeichnet.
- **Isolierte Bezugscontainer**: `multiply` wirkt im Reading Mode innerhalb der Sektion. Auf farbigen Theme-Hintergründen entspricht das Ergebnis annähernd normaler Transparenz.
- **Mobile**: Das Manifest erlaubt Mobile (`isDesktopOnly: false`), getestet ist es dort nicht.
- **Live Preview ohne Farbunterstützung** (z. B. 1.13.7): Das Farb-Emoji bleibt sichtbar. Es auszublenden, würde eigene Editor-Decorations erfordern, und darauf verzichtet das Plugin bewusst. Mit Farbunterstützung (1.15.1) blendet Obsidian es selbst aus.
- **Nicht im MVP**: individuelles Preset/Seed pro Markierung (erweiterte Syntax), schwebende Werkzeugleiste.
