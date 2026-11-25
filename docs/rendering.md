# Rendering-Verfahren

Algorithmusversion: **1.0.0** (`ALGORITHM_VERSION` in `src/engine/MarkerOptions.ts`).

## Koordinaten und Maßstab

Alle Koordinaten sind relativ zur linken oberen Ecke der gemessenen Zeilenbox (`width × height`). Die absolute Strichhöhe ist `H = height × strokeHeight`. **Alle Frequenzen und Amplituden sind in Vielfachen von `H` definiert** – der Strich skaliert also mit Schriftgröße, und ein langer Strich ist kein gestreckter kurzer Strich, sondern „sieht weiter“ in dasselbe Noise hinein.

## Ebenen

### 1. Grundgeometrie (`StrokeGeometry`)

- **Länge/Überstand**: Start bei `-overshoot·H·(0.65…1.35)`, Ende bei `width + overshoot·H·(0.65…1.35)`, pro Strich zufällig (deterministisch).
- **Keilspitze**: Die obere Kante ist gegenüber der unteren um `H·tan(tipAngle)·(0.92…1.08)` nach rechts versetzt → Parallelogramm mit parallelen, schrägen Enden.
- **Kontrollpunkte**: Abstand `0.34·H`, Anzahl `max(3, ceil(Länge / Abstand))` pro Kante – wächst linear mit der Länge.
- **Vertikale Bewegung**: Mittellinie = Zeilenmitte + `verticalOffset·height` + fBm-Noise (Wellenlänge `7·H`, Amplitude `0.13·verticalDrift·H`) + leichte Gesamtneigung (max. `0.22·verticalDrift·H`, bei langen Strichen auf die Länge verteilt). Wirkt auf beide Kanten gemeinsam.
- **Organische Kanten**: Pro Kante ein eigenes fBm (Wellenlänge `1.15·H`, 3 Oktaven) plus ein gemeinsamer, langsamer Anteil – Amplitude `0.05·roughness·H`. Keine unkorrelierten Zufallswerte → keine Zacken.
- **Anpressdruck** verändert die halbe Strichhöhe um bis zu ±8 %·`pressureVariation`.
- **Strichenden**: kubische Kurven mit leichter Wölbung nach außen (`0.025…0.07·H`) statt harter Ecken.
- **Umriss**: Catmull-Rom-Spline durch die Kantenpunkte → kubische Bézierkurven, Koordinaten auf 0,01 px gerundet.

### 2. Tintenauftrag (`InkTexture` + `SvgRenderer`)

Der Tintenauftrag wird als **Luminanzmaske** aufgebaut; darauf wird eine einfarbige Fläche in Markerfarbe mit `fill-opacity = opacity` maskiert. Vorteil: helle *und* dunkle Strukturen (weniger/mehr Tinte) lassen sich in einer Maske kombinieren, und die Farbe bleibt ein einziger Parameter.

| Ebene | Verfahren |
| --- | --- |
| **Grundfläche** | Umriss gefüllt mit einem horizontalen Grauverlauf. Basis 0.80; Druck ±22 %·`pressureVariation`. Der Verlauf ist per `skewX(tipAngle)` geschert, sodass Intensitätsbänder parallel zur Keilspitze verlaufen. |
| **Tintenansammlung** | Exponentiell abfallende Zusatzintensität an Anfang (`startInk`, Abklinglänge 0.42·H) und Ende (`endInk`, 0.34·H). Stützstellen an den Enden verdichtet. |
| **Ränder** (`edgeInk`) | Umriss zweimal weiß nachgezogen (0.2·H / 0.07·H breit, geringe Deckkraft), auf die Fläche geclippt → leicht dunklere Kanten wie bei echter Tinte. |
| **Fasern** | `4 + 26·fiberDensity` Fasern auf stratifizierten, gejitterten Höhen. Jede Faser besteht aus unterbrochenen Abschnitten zufälliger Länge (0.5–8·H), folgt Mittellinie und Druck und hat eine leichte Eigenwelle. Hälfte „dunkel“ (mehr Tinte, weiß in der Maske), Hälfte „hell“ (weniger Tinte, schwarz). Gebündelt in max. 8 Pfade (2 Typen × 4 Stärke-/Deckkraftstufen). |
| **Körnung** (`inkGrain`) | `feTurbulence` (fractalNoise, anisotrop: horizontal 0.45/H, vertikal 7/H, fester `seed`), per `feColorMatrix` in schwarze Fehlstellen mit Schwellwert umgerechnet. |

Alle Strukturen außer der Grundfläche sind per `clipPath` auf den Umriss begrenzt.

### 3. Farbverhalten

- **Light**: `mix-blend-mode: multiply` – verhält sich wie lasierende Tinte; Überlappungen (z. B. benachbarte Zeilen bei `strokeHeight > 1` oder sich überschneidende Markierungen) werden automatisch intensiver.
- **Dark** (`adaptConfigForTheme`): Multiply würde auf dunklem Grund die Farbe auslöschen. Stattdessen `normal` mit 50 % der Deckkraft; Fasern (×0.35) und Körnung (×0.3) werden gedämpft, da Fehlstellen auf dunklem Grund wie Schmutz wirken.
- Der Blend Mode kann im Playground manuell überschrieben werden.
- Der Text liegt immer als regulärer HTML-Text über dem SVG und wird nicht verändert.

## Parameter

| Parameter | Bereich | Classic | Wirkung |
| --- | --- | --- | --- |
| color | Hex | `#ffe81a` | Grundfarbe |
| opacity | 0–1 | 0.85 | Gesamtdeckkraft |
| strokeHeight | 0.3–1.6 | 0.94 | Strichhöhe relativ zur Zeilenhöhe |
| roughness | 0–1 | 0.30 | Kantenunregelmäßigkeit |
| verticalDrift | 0–1 | 0.30 | Vertikale Bewegung/Neigung |
| pressureVariation | 0–1 | 0.35 | Druckschwankung (Höhe + Intensität) |
| fiberIntensity | 0–1 | 0.35 | Sichtbarkeit der Fasern |
| fiberDensity | 0–1 | 0.55 | Anzahl/Dichte der Fasern |
| inkGrain | 0–1 | 0.25 | Feine Fehlstellen |
| tipAngle | 0–50° | 14° | Winkel der Keilspitze |
| startInk / endInk | 0–1 | 0.40 / 0.50 | Tintenansammlung an den Enden |
| overshoot | 0–1 (×H) | 0.22 | Überstand über den Text |
| edgeInk *(Erw.)* | 0–1 | 0.35 | Dunklere Ränder |
| verticalOffset *(Erw.)* | −0.3–0.3 | 0.04 | Vertikaler Versatz (× Zeilenhöhe) |
| blendMode *(Erw.)* | multiply/normal/screen/darken/lighten | multiply | Mischmodus |

Alle Werte werden in `normalizeConfig` geklemmt; NaN/Infinity fallen auf Standardwerte bzw. Minimum zurück, ungültige Farben auf den Standard. Breite wird auf 0–20 000 px, Höhe auf 1–2 000 px begrenzt.

## Technische Entscheidungen und Abweichungen von PROJECT.md

- **Zusätzliche Parameter** `edgeInk`, `verticalOffset`, `blendMode` – für Realismus (Randverstärkung) und Integration (Theme, Grundlinie) nötig.
- **Erweiterte `MarkerResult`-Felder** `offsetX/offsetY`, `baseSeed`, `cacheKey`, `stats` – der Strich ragt über die Zeilenbox hinaus; die Integration braucht die Position.
- **`generateMarkerLines`** als Hilfsfunktion für mehrzeilige Passagen.
- **Luminanzmaske statt mehrerer farbiger Ebenen** – erlaubt helle *und* dunkle Strukturen mit einer Farbe.
- **`feTurbulence` für die Körnung** – sehr kompakt und mit festem `seed` reproduzierbar. Die Geometrie bleibt vollständig in TypeScript berechnet.
- **Stroke Lab** (`lab.html`) zusätzlich zum Playground für die Detailbewertung.
- Struktur: Playground und Website liegen im eigenen Repo real-highlights-site (Komponenten MarkerOverlay, editorUtils), damit Obsidians Plugin-Scanner nur Plugin-Code prüft.

## Bekannte Einschränkungen

- **SVG-Größe**: ca. 10–20 KB pro Strich (hauptsächlich Faserpfade). Für viele Markierungen in Obsidian sollte die Faserauflösung ggf. reduziert oder auf ein `<pattern>` umgestellt werden.
- **`feTurbulence` ist browserabhängig**: Die Körnung ist pro Browser reproduzierbar, kann aber zwischen Engines minimal variieren (laut Spezifikation zulässig). Die Geometrie ist überall identisch.
- **Pixelgleichheit** zwischen Browsern/Betriebssystemen ist wegen unterschiedlicher Textmessung nicht garantiert (Spezifikation §7.5).
- **Algorithmusänderungen** verändern bestehende Markierungen. Ein Snapshot-Test schlägt in diesem Fall bewusst fehl; dann `ALGORITHM_VERSION` erhöhen und Snapshot aktualisieren (`npx vitest -u`).
- **Dark Mode**: Fluoreszierende Farben wirken auf dunklem Grund zwangsläufig gedeckter („olivfarben“ bei Gelb). Die Strategie ist bewusst einfach gehalten und sollte bei der Evaluation beurteilt werden.
- **Hintergrund-Tabs**: Das Overlay rendert per `requestAnimationFrame`; in ausgeblendeten Tabs erfolgt die Aktualisierung erst beim Sichtbarwerden.
- **Markieren im Playground** nutzt einfache DOM-Operationen; über Absatzgrenzen hinweg markierter Text wird in ein einzelnes `<mark>` verschoben und kann die Absatzstruktur verändern.
- **Visuelle Regressionstests** (Browser-Screenshots) sind noch nicht automatisiert; die visuelle Prüfung erfolgte manuell im Browser (Chromium).

## Gemessene Performance

Node, Apple Silicon, Classic-Preset, Mittel aus 50 Strichen (`tests/renderer.test.ts`):

| Strichbreite | Dauer |
| --- | --- |
| 50 px | ~0.14 ms |
| 300 px | ~0.32 ms |
| 1000 px | ~0.87 ms |
| 3000 px | ~2.4 ms |

Im Browser: Hauptvorschau (9–13 Striche) ca. 2–6 ms inkl. Messung und DOM-Update (Wert wird in der Toolbar angezeigt). Performance-Ziele für Obsidian sollten auf dieser Basis festgelegt werden.
