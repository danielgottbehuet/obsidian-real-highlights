# RealMarker – Realistische Textmarkierungen für Obsidian

## 1. Projektvision

RealMarker ist ein Obsidian-Plugin, das digitale Textmarkierungen möglichst realistisch an die Verwendung physischer Textmarker, beispielsweise eines STABILO BOSS, annähert.

Anstelle eines einfachen rechteckigen, einfarbigen Hintergrundes sollen Textpassagen so aussehen, als wären sie tatsächlich mit einem Textmarker auf Papier markiert worden.

Die Darstellung soll organisch, individuell und natürlich wirken, gleichzeitig aber die Lesbarkeit des Textes erhalten.

Ein zentraler Bestandteil ist die prozedurale und deterministische Generierung der Markierungen. Eine einmal markierte Textpassage soll bei erneutem Öffnen der Notiz unter gleichen Darstellungsbedingungen immer identisch aussehen, ohne dass dafür generierte Bilddateien gespeichert werden müssen.

Der Arbeitstitel des Projekts lautet **RealMarker**.

---

## 2. Visuelle Anforderungen

Die Rendering-Engine soll folgende Eigenschaften eines physischen Textmarkers simulieren:

- Leicht unregelmäßige obere und untere Strichkanten.
- Charakteristische schräge Strichenden durch die Keilspitze.
- Natürliche Schwankungen der Strichhöhe.
- Leichte vertikale Abweichungen im Strichverlauf.
- Unterschiedliche Farbintensitäten durch variierenden Anpressdruck.
- Feine horizontale Faserstrukturen der Markerspitze.
- Kleine Unregelmäßigkeiten im Tintenauftrag.
- Dezente Tintenansammlungen beim Ansetzen und Absetzen des Markers.
- Leichtes Überstehen über den eigentlichen Textbereich.
- Transparenter Farbauftrag zur Erhaltung der Lesbarkeit.
- Intensiverer Farbauftrag bei sich überlappenden Markerstrichen.

Die Effekte sollen subtil eingesetzt werden. Die Markierungen dürfen nicht wie Pinselstriche, Aquarellzeichnungen, grobe Kritzeleien oder künstlich gezackte Polygone aussehen.

Das visuelle Vorbild ist ein handelsüblicher Textmarker auf Papier.

Realismus hat Vorrang vor der Anzahl implementierter visueller Effekte.

---

## 3. Entwicklungsstrategie

Das Projekt wird in zwei wesentliche Entwicklungsabschnitte unterteilt.

### Phase 1: Eigenständiger Marker Playground

Entwicklung einer von Obsidian unabhängigen Rendering-Engine inklusive einer interaktiven Weboberfläche.

Der Playground dient der Entwicklung, Erprobung und visuellen Optimierung der Markerstriche.

### Phase 2: Obsidian-Plugin

Integration der zuvor entwickelten Rendering-Engine in Obsidian.

Die Rendering-Engine muss deshalb von Beginn an so konzipiert werden, dass sie ohne grundlegende Änderungen in das spätere Plugin übernommen werden kann.

Die Obsidian-Integration soll erst beginnen, wenn die Rendering-Engine eine überzeugende visuelle Qualität erreicht hat.

---

# Phase 1 – Marker Playground

## 4. Ziel des Playgrounds

Der Playground ist eine eigenständige, lokal ausführbare Webanwendung zur Entwicklung und Evaluation realistischer Textmarkierungen.

Er soll eine direkte visuelle Rückmeldung bei Änderungen der Generierungsparameter ermöglichen.

Es handelt sich nicht um einen Wegwerfprototypen. Die darin verwendete Rendering-Engine bildet die technische Grundlage des späteren Obsidian-Plugins.

Die Anwendung benötigt keinen Backend-Service, keine Datenbank und keine externen APIs.

Alle Berechnungen erfolgen lokal im Browser.

## 5. Technologiestack

Bevorzugte Technologien:

- TypeScript
- HTML
- CSS
- SVG
- Vite als Entwicklungsumgebung
- Vitest für automatisierte Tests
- Seeded Pseudo Random Number Generator

Die Benutzeroberfläche kann mit Vanilla TypeScript umgesetzt werden. Ein umfangreiches UI-Framework ist für den Playground nicht erforderlich.

SVG wird als bevorzugtes Rendering-Format verwendet, da es auflösungsunabhängig ist, flexibel generiert werden kann und sich gut für die spätere Integration in Obsidian eignet.

Canvas kann ergänzend für experimentelle Rendering-Verfahren oder Texturmessungen verwendet werden.

Die eigentliche Markierungs-Engine darf keine Abhängigkeiten von Obsidian oder der Playground-Oberfläche besitzen.

## 6. Benutzeroberfläche des Playgrounds

Die Oberfläche soll übersichtlich und funktional aufgebaut sein.

### 6.1 Vorschau

Die Vorschau bildet den zentralen Bereich der Anwendung.

Sie soll folgende Möglichkeiten bieten:

- Darstellung frei editierbarer Texte.
- Markierung einzelner Textpassagen.
- Darstellung kurzer und langer Markierungen.
- Darstellung mehrzeiliger Markierungen.
- Veränderbare Breite des Textcontainers.
- Veränderbare Schriftgröße.
- Unterschiedliche Schriftarten.
- Light Mode und Dark Mode.
- Darstellung mehrerer Markierungen innerhalb eines Textes.
- Direkter Vergleich verschiedener Marker-Presets.
- Vergleich einer klassischen rechteckigen Markierung mit der realistischen Variante.

Die Schrift muss als regulärer HTML-Text dargestellt werden. Sie soll nicht Bestandteil der generierten Markierungsgrafik sein.

Die Markerstriche werden unabhängig vom Text im Hintergrund gerendert.

### 6.2 Konfigurationsparameter

Folgende Parameter sollen interaktiv einstellbar sein:

| Parameter          | Beschreibung                                   |
| ------------------ | ---------------------------------------------- |
| Color              | Grundfarbe des Markers                         |
| Opacity            | Allgemeine Deckkraft                           |
| Stroke Height      | Relative Höhe des Markerstrichs                |
| Edge Roughness     | Unregelmäßigkeit der Strichkanten              |
| Vertical Drift     | Vertikale Bewegung des Strichs                 |
| Pressure Variation | Schwankung des Tintenauftrags                  |
| Fiber Intensity    | Sichtbarkeit der Faserstruktur                 |
| Fiber Density      | Dichte der Faserstruktur                       |
| Ink Grain          | Feine Unregelmäßigkeiten im Tintenauftrag      |
| Tip Angle          | Winkel der Keilspitze                          |
| Start Ink          | Tintenansammlung am Strichanfang               |
| End Ink            | Tintenansammlung am Strichende                 |
| Overshoot          | Überstand über den Textbereich                 |
| Seed               | Ausgangswert der deterministischen Generierung |

Änderungen sollen unmittelbar in der Vorschau sichtbar werden.

Die Parameterbereiche müssen sinnvoll begrenzt werden, damit auch extreme Einstellungen keine ungültigen SVG-Geometrien erzeugen.

### 6.3 Zusätzliche Funktionen

- Zurücksetzen auf Standardwerte.
- Generierung einer neuen Strichvariante durch Änderung des Seeds.
- Anzeige des automatisch berechneten Seeds.
- Manueller Seed-Override für Experimente.
- Export des generierten SVG.
- Export und Import der Marker-Konfiguration als JSON.
- Kopieren der aktuellen Konfiguration in die Zwischenablage.
- Anzeige der Generierungsdauer.
- Optionaler Debug-Modus zur Darstellung der Kontrollpunkte und einzelnen Rendering-Ebenen.

---

## 7. Deterministische Rendering-Engine

### 7.1 Grundprinzip

Die Markerstriche sollen zufällig und individuell aussehen, aber nicht tatsächlich bei jedem Rendering neu ausgewürfelt werden.

Bei identischen Eingabeparametern muss die Engine immer dasselbe Ergebnis erzeugen.

Es darf innerhalb der Rendering-Engine kein unkontrolliertes `Math.random()` verwendet werden.

Stattdessen wird ein deterministischer Pseudozufallszahlengenerator verwendet, beispielsweise Mulberry32.

### 7.2 Seed-Berechnung

Die Länge der markierten Textpassage ist ein zentraler Bestandteil der Generierung.

Da unterschiedliche Texte mit identischer Zeichenanzahl nicht zwangsläufig identische Markierungen erhalten sollen, wird zusätzlich der Textinhalt berücksichtigt.

Beispiel:

```typescript
const baseSeed = hash(
    `${text.length}:${text}`
);
```

Die Hash-Funktion muss stabil und plattformunabhängig sein.

Geeignete Verfahren sind beispielsweise FNV-1a oder eine vergleichbare deterministische 32-Bit-Hash-Funktion.

Anforderungen:

- Identischer Text erzeugt denselben Seed.
- Unterschiedliche Texte können unterschiedliche Seeds erzeugen.
- Ein manuell gesetzter Seed kann den automatisch generierten Seed überschreiben.
- Die Position des Textes innerhalb eines Dokuments beeinflusst den Seed standardmäßig nicht.
- Änderungen an nicht markierten Textpassagen beeinflussen bestehende Markierungen nicht.
- Ein Neustart der Anwendung verändert keine Markierung.

### 7.3 Geometrische Berechnungsgrundlage

Es muss zwischen zwei Arten von Textlänge unterschieden werden:

1. Zeichenanzahl der markierten Passage.
2. Tatsächlich gerenderte Breite und Höhe der Passage.

Die Zeichenanzahl und der Textinhalt bestimmen den Seed.

Die tatsächlich gerenderten Dimensionen bestimmen die Geometrie des Markerstrichs.

Die Breite darf nicht ausschließlich aus der Zeichenanzahl geschätzt werden, da unterschiedliche Zeichen, Schriftarten und Schriftgrößen unterschiedliche Dimensionen besitzen.

### 7.4 Längenabhängige Generierung

Die Anzahl der geometrischen Kontrollpunkte und strukturellen Variationen soll von der tatsächlichen Strichlänge abhängen.

Beispiel:

```typescript
const pointDistance = 12;

const pointCount = Math.max(
    3,
    Math.ceil(width / pointDistance)
);
```

Der Abstand der Kontrollpunkte sollte relativ zur Strichhöhe beziehungsweise Schriftgröße skalierbar sein.

Ein langer Markerstrich soll mehr natürliche Variationen besitzen als ein kurzer Markerstrich.

Ein kurzer Strich darf nicht einfach horizontal gestreckt werden, um einen langen Strich zu erzeugen.

Die Frequenz und Amplitude der Unregelmäßigkeiten sollen unabhängig von der Gesamtlänge kontrollierbar bleiben.

### 7.5 Reproduzierbarkeit

Folgende Eingaben bestimmen gemeinsam das Rendering-Ergebnis:

- Textinhalt.
- Textlänge.
- Seed.
- Gerenderte Breite.
- Gerenderte Höhe.
- Marker-Konfiguration.
- Algorithmusversion.
- Gegebenenfalls Zeilenindex.

Bei identischen Eingaben muss die generierte SVG-Geometrie identisch sein.

Pixelgenaue Gleichheit zwischen unterschiedlichen Browsern oder Betriebssystemen ist aufgrund unterschiedlicher Text- und Grafikrendering-Verfahren nicht zwingend erforderlich.

---

## 8. Aufbau eines Markerstrichs

Ein Markerstrich soll aus mehreren logisch getrennten Rendering-Ebenen bestehen.

### 8.1 Grundgeometrie

Die Grundgeometrie bildet die Fläche, die durch eine physische Markerspitze auf dem Papier entstehen würde.

Eigenschaften:

- Leicht parallelogrammförmige Grundfläche.
- Schräge Strichenden.
- Leichter horizontaler Überstand.
- An die Texthöhe angepasste Strichhöhe.
- Natürlicher Strichanfang und natürliches Strichende.

Der Winkel der Keilspitze soll konfigurierbar sein.

### 8.2 Organische Kontur

Die obere und untere Kante werden durch deterministisch generierte Kontrollpunkte beschrieben.

Geeignete Verfahren:

- Interpoliertes Value Noise.
- Eindimensionales Smooth Noise.
- Bézierkurven.
- Catmull-Rom-Splines.

Die Kontur soll kontinuierlich und weich verlaufen.

Hochfrequente, unkorrelierte Zufallswerte sind zu vermeiden, da sie schnell zu künstlich gezackten Kanten führen.

Die obere und untere Kante dürfen sich teilweise gemeinsam bewegen, um eine natürliche Bewegung des gesamten Markers zu simulieren.

### 8.3 Vertikale Bewegung

Der Marker soll sich während eines Strichs leicht nach oben oder unten bewegen können.

Diese Bewegung soll durch niederfrequentes, geglättetes Noise simuliert werden.

Die vertikale Bewegung beeinflusst beide Strichkanten gemeinsam.

### 8.4 Anpressdruck

Der Anpressdruck eines physischen Markers verändert sich während des Markierens.

Dies kann sich auswirken auf:

- Strichhöhe.
- Farbintensität.
- Deckkraft.
- Stärke der Faserstruktur.

Die Veränderungen sollen entlang des Strichverlaufs weich interpoliert werden.

SVG-Gradienten können zur Simulation des variierenden Tintenauftrags verwendet werden.

### 8.5 Faserstruktur

Die Markerspitze besitzt eine feine Faserstruktur, die sich im Tintenauftrag widerspiegeln kann.

Diese soll durch dezente, überwiegend horizontale Strukturen simuliert werden.

Anforderungen:

- Unterschiedliche Linienstärken.
- Unterschiedliche Intensitäten.
- Leichte vertikale Abweichungen.
- Teilweise unterbrochene Strukturen.
- Begrenzung auf die Grundgeometrie mittels Clipping.
- Deterministische Generierung.

Die Faserstruktur darf nicht wie eine gleichmäßige Schraffur aussehen.

### 8.6 Tintenstruktur

Zusätzlich zur Faserstruktur können feine lokale Schwankungen des Tintenauftrags generiert werden.

Diese sollen eine natürliche Materialwirkung erzeugen.

Mögliche Verfahren:

- Deterministische Noise-Texturen.
- Kleine transparente Strukturen.
- Lokal variierende Farbintensitäten.
- SVG-Filter, sofern performant und reproduzierbar.

Die Tintenstruktur soll sehr subtil bleiben und darf die Lesbarkeit nicht beeinträchtigen.

### 8.7 Tintenansammlung

Beim Ansetzen und Absetzen des Markers kann sich etwas mehr Tinte auf dem Papier sammeln.

Diese Bereiche sollen durch lokale Änderungen der Deckkraft oder Farbintensität simuliert werden.

Die Intensität am Anfang und Ende soll unabhängig konfigurierbar sein.

### 8.8 Farbverhalten

Die Markierung soll grundsätzlich hinter dem Text dargestellt werden.

Für helle Hintergründe kann mit einem Multiply-artigen Farbverhalten experimentiert werden.

Für dunkle Hintergründe müssen geeignete alternative Farb- und Transparenzstrategien vorgesehen werden.

Der Text selbst darf durch die Markierung nicht unnötig verändert werden.

---

## 9. Mehrzeilige Markierungen

Eine Textpassage kann sich abhängig von der verfügbaren Breite über mehrere sichtbare Zeilen erstrecken.

Wie bei einem physischen Textmarker soll jede sichtbare Zeile einen eigenständigen Markerstrich erhalten.

Die tatsächlichen Textdimensionen können beispielsweise über DOM-Ranges und `getClientRects()` ermittelt werden.

Mehrere DOM-Rechtecke derselben visuellen Zeile, etwa durch fett oder kursiv formatierten Text, sollen zu einem sinnvollen gemeinsamen Zeilenbereich zusammengeführt werden.

Für jede Zeile wird ein eigener Seed abgeleitet:

```typescript
const lineSeed = hash(
    `${baseSeed}:${lineIndex}`
);
```

Dadurch entsteht pro Zeile ein leicht unterschiedlicher, aber reproduzierbarer Markerstrich.

Anforderungen:

- Automatische Anpassung an Zeilenumbrüche.
- Automatische Anpassung an Fenstergrößenänderungen.
- Automatische Anpassung an Schriftgrößenänderungen.
- Identische Darstellung bei Wiederherstellung derselben Layoutbedingungen.
- Keine Markierung außerhalb des tatsächlichen Textbereichs, abgesehen vom konfigurierten Überstand.

Wenn sich die Zeilenumbrüche verändern, darf sich auch die Markierungsgeometrie verändern.

Wird die ursprüngliche Containerbreite wiederhergestellt, muss auch die ursprüngliche Markierung wiederhergestellt werden.

---

## 10. Marker-Presets

Die Engine soll vorkonfigurierte Marker-Presets unterstützen.

### Classic

Klassischer fluoreszierender Textmarker mit gleichmäßigem, kräftigem Tintenauftrag und subtiler Faserstruktur.

Dieses Preset ist der wichtigste visuelle Referenzpunkt und soll zuerst optimiert werden.

### Pastel

Weicher, weniger intensiver Textmarker mit dezenter Farbgebung.

### Dry Marker

Leicht ausgetrockneter Textmarker mit stärker sichtbarer Faserstruktur und teilweise unvollständigem Tintenauftrag.

### Quick Stroke

Schnell ausgeführter Markerstrich mit etwas stärkerer vertikaler Bewegung und ungleichmäßigem Tintenauftrag.

### Heavy Ink

Satter Markerstrich mit höherer Farbintensität und stärkerer Tintenansammlung.

Presets sind ausschließlich Konfigurationen derselben Rendering-Engine und sollen keine vollständig getrennten Rendering-Implementierungen benötigen.

### Farbpalette

Initial sollen mindestens folgende Farben unterstützt werden:

- Fluoreszierendes Gelb.
- Pink.
- Grün.
- Orange.
- Blau.
- Violett.

Zusätzlich sollen benutzerdefinierte Farben möglich sein.

---

## 11. Rendering-Engine – Architektur

Die Engine soll modular aufgebaut werden.

### Komponenten

**SeededRandom**

Bereitstellung stabiler Hash-Funktionen und deterministischer Zufallszahlengeneratoren.

**StrokeGeometry**

Berechnung der Grundform, Konturen, Keilspitze und vertikalen Bewegung.

**NoiseGenerator**

Bereitstellung geglätteter, deterministischer Noise-Funktionen.

**PressureModel**

Simulation des variierenden Anpressdrucks.

**InkTexture**

Generierung von Faserstrukturen und Tintenunregelmäßigkeiten.

**MarkerPresets**

Verwaltung vordefinierter Marker-Konfigurationen.

**SvgRenderer**

Zusammenführung der Rendering-Ebenen zu einer SVG-Darstellung.

**MarkerEngine**

Zentrale öffentliche Schnittstelle zur Generierung eines Markerstrichs.

**TextMeasurement**

Ermittlung der tatsächlichen Textdimensionen und visuellen Zeilen. Diese Komponente gehört zur Integrationsschicht und nicht zum DOM-unabhängigen Kern der Engine.

**RenderCache**

Zwischenspeicherung bereits generierter Markerstriche.

### Beispielhafte Schnittstelle

```typescript
interface MarkerOptions {
    text: string;
    width: number;
    height: number;

    color: string;
    opacity: number;

    strokeHeight: number;
    roughness: number;
    verticalDrift: number;

    pressureVariation: number;

    fiberIntensity: number;
    fiberDensity: number;
    inkGrain: number;

    tipAngle: number;
    startInk: number;
    endInk: number;
    overshoot: number;

    seed?: number;
    lineIndex?: number;
}

interface MarkerResult {
    svg: string;
    seed: number;
    width: number;
    height: number;
    algorithmVersion: string;
}

interface MarkerEngine {
    generate(options: MarkerOptions): MarkerResult;
}
```

Die Schnittstelle ist ein Ausgangspunkt und kann während der Implementierung sinnvoll weiterentwickelt werden.

Die zentrale Generierungsfunktion soll möglichst als reine Funktion ohne Seiteneffekte implementiert werden.

SVG-IDs für Filter, Gradienten und Clipping müssen so gehandhabt werden, dass mehrere Markierungen innerhalb eines Dokuments keine Konflikte verursachen.

---

## 12. Projektstruktur

Vorgeschlagene Struktur:

```text
realmarker/
├── package.json
├── tsconfig.json
├── README.md
├── PROJECT.md
├── src/
│   ├── engine/
│   │   ├── MarkerEngine.ts
│   │   ├── MarkerOptions.ts
│   │   ├── SeededRandom.ts
│   │   ├── NoiseGenerator.ts
│   │   ├── StrokeGeometry.ts
│   │   ├── PressureModel.ts
│   │   ├── InkTexture.ts
│   │   ├── MarkerPresets.ts
│   │   └── SvgRenderer.ts
│   ├── shared/
│   │   ├── TextMeasurement.ts
│   │   └── RenderCache.ts
│   ├── playground/
│   │   ├── main.ts
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── components/
│   └── obsidian/
│       ├── main.ts
│       ├── settings.ts
│       └── integrations/
│           ├── LivePreview.ts
│           └── ReadingMode.ts
├── tests/
│   ├── determinism.test.ts
│   ├── geometry.test.ts
│   ├── noise.test.ts
│   └── renderer.test.ts
└── docs/
    ├── architecture.md
    └── rendering.md
```

Die Obsidian-Komponenten müssen während Phase 1 noch nicht implementiert werden.

Die Projektstruktur ist als Orientierung zu verstehen und darf an sinnvolle technische Anforderungen angepasst werden.

---

# Phase 2 – Obsidian-Plugin

## 13. Ziel der Obsidian-Integration

Nach erfolgreicher Entwicklung der Rendering-Engine soll diese in ein eigenständiges Obsidian-Plugin integriert werden.

Das Plugin soll bestehende und neu erstellte Textmarkierungen realistisch darstellen.

Die Markdown-Dateien sollen weiterhin möglichst portabel und unabhängig vom Plugin bleiben.

## 14. Markdown-Kompatibilität

Für die erste Version soll die native Obsidian-Highlight-Syntax verwendet werden.

```markdown
Das ist eine ==markierte Textpassage==.
```

Das Plugin verändert ausschließlich die visuelle Darstellung der Markierung.

Vorteile:

- Bestehende Markierungen werden automatisch unterstützt.
- Keine Migration vorhandener Notizen erforderlich.
- Keine Speicherung generierter SVG-Dateien erforderlich.
- Keine proprietären Metadaten erforderlich.
- Markierungen bleiben nach Deinstallation des Plugins erhalten.

Die Markerfarbe wird in der ersten Version global über die Plugin-Einstellungen definiert.

### Optionale spätere Erweiterung

Individuelle Farben, Presets und Seeds können später durch eine erweiterte Syntax unterstützt werden.

Beispiel:

```html
<mark data-color="pink" data-seed="48291">
    Markierter Text
</mark>
```

Vor der Einführung einer erweiterten Syntax muss geprüft werden, wie diese zuverlässig im Reading Mode und Live Preview verarbeitet werden kann.

Die native Markdown-Syntax bleibt weiterhin unterstützt.

---

## 15. Obsidian-Integrationen

### 15.1 Reading Mode

Verwendung der Obsidian Markdown Post Processor API.

Aufgaben:

- Erkennen nativer Highlight-Elemente.
- Ermitteln der Textdimensionen.
- Ermitteln visueller Zeilen.
- Berechnen der Markerstriche.
- Darstellung der generierten SVGs hinter dem Text.
- Aktualisierung bei relevanten Layoutänderungen.
- Entfernen eigener DOM-Elemente und Observer beim Unload.

### 15.2 Live Preview

Verwendung von CodeMirror 6 und der Obsidian Editor Extension API.

Aufgaben:

- Erkennen markierter Textbereiche.
- Ermitteln der sichtbaren Textdimensionen.
- Darstellung realistischer Markerstriche.
- Aktualisierung bei Textänderungen.
- Aktualisierung bei Layoutänderungen.
- Berücksichtigung des sichtbaren Editorbereichs.

CodeMirror Decorations können zur Identifikation und Darstellung der markierten Bereiche verwendet werden.

Die genaue Strategie für mehrzeilige SVG-Hintergründe muss im Rahmen der Implementierung evaluiert werden.

Die Integration darf nicht:

- Die Cursorposition verändern.
- Textselektion beeinträchtigen.
- Die Zeilenhöhe unbeabsichtigt verändern.
- Die Markdown-Bearbeitung behindern.
- Unnötige Editor-Neuberechnungen auslösen.

### 15.3 Source Mode

Der klassische Source Mode kann in der ersten Version unverändert bleiben.

Eine optionale Unterstützung kann später ergänzt werden.

---

## 16. Benutzerinteraktion

Das Plugin soll perspektivisch folgende Interaktionen unterstützen:

- Markieren einer ausgewählten Textpassage.
- Entfernen einer bestehenden Markierung.
- Konfigurierbarer Tastatur-Shortcut.
- Integration in das Editor-Kontextmenü.
- Auswahl unterschiedlicher Markerfarben.
- Auswahl unterschiedlicher Marker-Presets.
- Optionale schwebende Werkzeugleiste bei Textselektion.

Die erste Plugin-Version soll sich auf die zuverlässige Darstellung nativer Markdown-Markierungen konzentrieren.

Eine eigene Werkzeugleiste ist kein Bestandteil des initialen MVP.

---

## 17. Plugin-Einstellungen

Die Plugin-Einstellungen sollen mindestens folgende Optionen anbieten:

- Realistische Markierungen aktivieren oder deaktivieren.
- Standardfarbe auswählen.
- Standard-Preset auswählen.
- Deckkraft einstellen.
- Strichhöhe einstellen.
- Kantenunregelmäßigkeit einstellen.
- Faserstruktur einstellen.
- Tintenintensität einstellen.
- Light-Mode-Konfiguration.
- Dark-Mode-Konfiguration.
- Einstellungen zurücksetzen.

Optional kann eine integrierte Live-Vorschau angeboten werden, die auf derselben Engine wie der Playground basiert.

---

## 18. Performance

Das Plugin muss auch bei umfangreichen Notizen mit vielen Markierungen performant bleiben.

### Anforderungen

- Kein kontinuierlicher Rendering-Loop.
- Keine permanenten Animationen.
- Keine vollständige Neuberechnung bei jedem Tastendruck.
- Möglichst nur sichtbare Markierungen im Live Preview verarbeiten.
- Layoutmessungen und DOM-Änderungen sinnvoll bündeln.
- Relevante Änderungen debouncen oder über geeignete Rendering-Zyklen bündeln.
- Unnötige SVG-Komplexität vermeiden.
- Speicherverbrauch begrenzen.
- Event Listener und Observer zuverlässig entfernen.

### Caching

Bereits generierte Markerstriche sollen zwischengespeichert werden können.

Beispielhafte Berechnungsgrundlage:

```typescript
const cacheKey = hash(
    stableSerialize({
        seed,
        width,
        height,
        markerOptions,
        algorithmVersion
    })
);
```

Der Cache-Key muss sämtliche renderrelevanten Parameter berücksichtigen.

Der Cache soll eine begrenzte Größe besitzen, beispielsweise durch eine LRU-Strategie.

---

## 19. Algorithmusversionierung

Die Rendering-Engine soll eine explizite Algorithmusversion besitzen.

Beispiel:

```typescript
const ALGORITHM_VERSION = "1.0.0";
```

Dadurch können Änderungen am Generierungsalgorithmus nachvollzogen werden.

Die Algorithmusversion ist Bestandteil des Cache-Keys.

Es muss berücksichtigt werden, dass Änderungen am Algorithmus bestehende Markierungen optisch verändern können.

Eine spätere Abwärtskompatibilität unterschiedlicher Algorithmusversionen ist wünschenswert, aber nicht zwingend Bestandteil des MVP.

Ohne persistent gespeicherte Versionsinformationen pro Markierung kann nicht garantiert werden, dass eine Markierung nach einem Algorithmuswechsel weiterhin exakt gleich aussieht.

---

## 20. Tests und Qualitätssicherung

### Determinismus

Automatisierte Tests müssen sicherstellen, dass:

- Identische Eingaben identische SVG-Ausgaben erzeugen.
- Wiederholte Aufrufe keine abweichenden Ergebnisse erzeugen.
- Unterschiedliche Seeds unterschiedliche Strichvarianten erzeugen können.
- Änderungen an anderen Textpassagen bestehende Markierungen nicht beeinflussen.
- Ein Neustart keine Veränderung verursacht.

### Geometrie

Tests für:

- Sehr kurze Texte.
- Einzelne Zeichen.
- Sehr lange Texte.
- Unterschiedliche Schriftgrößen.
- Unterschiedliche Strichhöhen.
- Extreme Parameterwerte.
- Leere Texte.
- Ungültige Eingabewerte.
- Mehrzeilige Markierungen.
- Unicode-Zeichen und Emojis.

Die Engine darf keine ungültigen Koordinaten, NaN-Werte oder fehlerhafte SVG-Pfade erzeugen.

### Visuelle Qualität

Die Markierungen sollen anhand unterschiedlicher Testpassagen visuell geprüft werden.

Bewertungskriterien:

- Natürlichkeit der Strichkontur.
- Realistische Keilspitze.
- Plausibler Tintenauftrag.
- Subtile Faserstruktur.
- Gute Lesbarkeit.
- Keine auffälligen Wiederholungsmuster.
- Keine künstlich wirkenden Zacken.
- Konsistente Darstellung bei unterschiedlichen Textlängen.
- Geeignete Darstellung auf hellen und dunklen Hintergründen.

Wenn möglich, sollen automatisierte Browser-Screenshots und visuelle Regressionstests ergänzt werden.

### Performance

Die Generierungsdauer soll für unterschiedliche Textlängen und Mengen an Markierungen gemessen werden.

Performance-Ziele sollen anhand tatsächlicher Messungen festgelegt und nicht ohne vorherige Evaluation angenommen werden.

---

## 21. Entwicklungsmeilensteine

### Meilenstein 1 – Projektgrundlage

- TypeScript-Projekt initialisieren.
- Entwicklungsumgebung einrichten.
- Projektstruktur erstellen.
- Testumgebung einrichten.
- Deterministischen Zufallszahlengenerator implementieren.
- Stabile Seed-Berechnung implementieren.

### Meilenstein 2 – Grundlegende Rendering-Engine

- SVG-Grundgeometrie.
- Keilspitze.
- Längenabhängige Kontrollpunkte.
- Geglättete Konturen.
- Vertikale Bewegung.
- Deterministische Generierung.

### Meilenstein 3 – Realistischer Tintenauftrag

- Anpressdruck.
- Faserstruktur.
- Tintenstruktur.
- Tintenansammlung.
- Transparenz und Farbverhalten.
- Optimierung des Classic-Presets.

### Meilenstein 4 – Interaktiver Playground

- Editierbare Textvorschau.
- Interaktive Konfigurationsparameter.
- Seed-Steuerung.
- Presets.
- Mehrzeilige Markierungen.
- Dynamische Containerbreite.
- Light Mode und Dark Mode.
- SVG- und JSON-Export.

### Meilenstein 5 – Evaluation

- Visuelle Optimierung.
- Automatisierte Tests.
- Performance-Messungen.
- Dokumentation der Rendering-Engine.
- Überprüfung der Wiederverwendbarkeit.

**Nach Abschluss dieses Meilensteins soll die visuelle Qualität durch den Projektverantwortlichen bewertet werden.**

Erst nach dessen Freigabe soll die Obsidian-Integration begonnen werden.

### Meilenstein 6 – Obsidian Reading Mode

- Plugin-Grundgerüst.
- Integration der Rendering-Engine.
- Native Markdown-Markierungen.
- Mehrzeilige Darstellung.
- Plugin-Einstellungen.

### Meilenstein 7 – Obsidian Live Preview

- CodeMirror-Integration.
- Dynamische Darstellung.
- Textänderungen.
- Layoutänderungen.
- Performance-Optimierung.

### Meilenstein 8 – Erweiterungen

- Individuelle Markerfarben.
- Kontextmenü.
- Shortcuts.
- Werkzeugleiste.
- Mobile-Kompatibilität.
- Weitere Marker-Presets.

---

## 22. Definition of Done – Playground

Phase 1 gilt als technisch abgeschlossen, wenn:

- [ ] Der Playground lokal gestartet werden kann.
- [ ] Die Rendering-Engine unabhängig von der Benutzeroberfläche verwendbar ist.
- [ ] Markerstriche organisch und natürlich aussehen.
- [ ] Die Generierung vollständig deterministisch erfolgt.
- [ ] Die Geometrie anhand der tatsächlichen Textdimensionen berechnet wird.
- [ ] Kurze und lange Textpassagen korrekt dargestellt werden.
- [ ] Mehrzeilige Markierungen unterstützt werden.
- [ ] Änderungen der Containerbreite korrekt verarbeitet werden.
- [ ] Die ursprüngliche Darstellung bei Wiederherstellung identischer Parameter reproduziert wird.
- [ ] Alle wesentlichen Rendering-Parameter interaktiv einstellbar sind.
- [ ] Marker-Presets unterstützt werden.
- [ ] Light Mode und Dark Mode getestet wurden.
- [ ] SVG- und Konfigurationsexport funktionieren.
- [ ] Automatisierte Tests erfolgreich ausgeführt werden.
- [ ] Die Engine-Schnittstelle dokumentiert ist.
- [ ] Bekannte Einschränkungen dokumentiert sind.
- [ ] Eine visuelle Evaluation durch den Projektverantwortlichen möglich ist.

---

## 23. Langfristige Erweiterungsmöglichkeiten

Diese Funktionen sind nicht Bestandteil des initialen MVP, sollen aber durch die Architektur nicht ausgeschlossen werden.

- Simulation unterschiedlicher physischer Textmarkermodelle.
- Simulation unterschiedlicher Papiersorten.
- Analyse eingescannter realer Markerstriche zur Kalibrierung der Generierungsparameter.
- Unterschiedliche Abnutzungsgrade der Markerspitze.
- Simulation der Markiergeschwindigkeit.
- Mehrfaches Überstreichen derselben Textpassage.
- Benutzerdefinierte Marker-Presets.
- Individuelle Marker-Konfiguration pro Textpassage.
- Realistische Unterstreichungen.
- Realistische handgezeichnete Umrandungen.
- Weitere analoge Annotationselemente.

---

# 24. Arbeitsanweisung für den Implementierungsagenten

Du bist für die technische Konzeption und Implementierung des Projekts RealMarker verantwortlich.

Verwende dieses Dokument als zentrale Projektspezifikation.

Beginne ausschließlich mit Phase 1, dem eigenständigen Marker Playground und der wiederverwendbaren Rendering-Engine.

Gehe dabei folgendermaßen vor:

1. Analysiere den vorhandenen Repository-Zustand.
2. Leite aus dieser Spezifikation einen konkreten Implementierungsplan ab.
3. Initialisiere bei Bedarf die Projektstruktur.
4. Implementiere zunächst die deterministische Rendering-Engine.
5. Entwickle und teste die einzelnen Rendering-Ebenen modular.
6. Implementiere den interaktiven Playground.
7. Optimiere die visuelle Darstellung iterativ.
8. Führe automatisierte Tests durch.
9. Prüfe die Anwendung im Browser, sofern entsprechende Werkzeuge verfügbar sind.
10. Dokumentiere die Architektur, Schnittstellen und Startbefehle.
11. Dokumentiere technische Entscheidungen und bekannte Einschränkungen.
12. Stelle den Playground zur visuellen Evaluation bereit.

## Verbindliche Entwicklungsprinzipien

- Realismus ist das wichtigste Qualitätsmerkmal.
- Determinismus ist eine zwingende technische Anforderung.
- Die Rendering-Engine muss unabhängig von Obsidian sein.
- Die Rendering-Engine muss unabhängig von der Playground-Oberfläche sein.
- Vermeide unnötige externe Abhängigkeiten.
- Vermeide unnötige Komplexität.
- Verwende keine statischen Markerbilder als primäre Rendering-Lösung.
- Verwende keine unkontrollierten Zufallswerte.
- Erhalte die Lesbarkeit des Textes.
- Bevorzuge nachvollziehbare, wartbare und testbare Implementierungen.
- Triff sinnvolle technische Entscheidungen eigenständig und dokumentiere relevante Abweichungen von dieser Spezifikation.
- Bewahre vorhandene, nicht zum Projekt gehörende Änderungen im Repository.
- Behaupte keine erfolgreichen Tests oder visuellen Prüfungen, wenn diese nicht tatsächlich durchgeführt wurden.

## Erwartetes Ergebnis des ersten Entwicklungsabschnitts

Ein lokal ausführbarer, funktionsfähiger Marker Playground mit einer modularen, deterministischen SVG-Rendering-Engine, interaktiven Konfigurationsmöglichkeiten, mehreren Marker-Presets, automatisierten Tests und vollständiger technischer Dokumentation.

Der Playground soll als Grundlage für die gemeinsame visuelle Optimierung dienen.

Beginne nicht eigenständig mit der vollständigen Obsidian-Integration. Warte nach Fertigstellung des Playgrounds auf die visuelle Evaluation und Freigabe durch den Projektverantwortlichen.
