/**
 * Farbige Highlights nach Obsidian-Syntax: `==🔴Text==` usw.
 * (https://obsidian.md/help/syntax#Highlight+colors)
 *
 * Obsidian-Versionen mit Farbunterstützung (getestet: 1.15.1) rendern:
 * - Reading Mode: `<mark data-highlight="red">Text</mark>` (Emoji entfernt)
 * - Live Preview: `<span class="cm-highlight cm-highlight-red">Text</span>` (Emoji ausgeblendet)
 * Versionen ohne Farbunterstützung (getestet: 1.13.7) zeigen das Emoji als
 * normalen Text; dann wird die Farbe aus dem führenden Emoji abgeleitet. Die
 * genaue Einführungsversion ist nicht dokumentiert. Das Plugin prüft daher
 * keine Versionsnummer, sondern erkennt beide Darstellungen am DOM.
 */

export const HIGHLIGHT_COLORS = ["red", "orange", "yellow", "green", "blue", "purple"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const HIGHLIGHT_EMOJI: Record<HighlightColor, string> = {
  red: "🔴",
  orange: "🟠",
  yellow: "🟡",
  green: "🟢",
  blue: "🔵",
  purple: "🟣",
};

/** Textmarker-Varianten der Obsidian-Farben (Obsidians UI-Farben sind für Marker zu kräftig). */
export const DEFAULT_PALETTE: Record<HighlightColor, string> = {
  red: "#ff6b6b",
  orange: "#ffa63d",
  yellow: "#ffe81a",
  green: "#7cf05c",
  blue: "#5cc8ff",
  purple: "#be95ff",
};

export function isHighlightColor(value: unknown): value is HighlightColor {
  return typeof value === "string" && (HIGHLIGHT_COLORS as readonly string[]).includes(value);
}

/** Erkennt ein führendes Farb-Emoji (Versionen ohne Farbunterstützung zeigen es als Text). */
export function leadingColorEmoji(text: string): { color: HighlightColor; emoji: string } | null {
  for (const color of HIGHLIGHT_COLORS) {
    const emoji = HIGHLIGHT_EMOJI[color];
    if (text.startsWith(emoji)) return { color, emoji };
  }
  return null;
}

/**
 * Text, aus dem der Seed berechnet wird: ohne führendes Farb-Emoji. Dadurch
 * ändert ein Farbwechsel nur die Farbe, nicht die Form des Strichs, und alte
 * und neue Obsidian-Versionen erzeugen denselben Strich.
 */
export function seedText(text: string): string {
  const lead = leadingColorEmoji(text);
  return lead ? text.slice(lead.emoji.length) : text;
}

/** Farbe eines Reading-Mode-<mark>: data-highlight (mit Farbunterstützung) oder führendes Emoji (ohne). */
export function markColor(mark: HTMLElement): HighlightColor | null {
  const attr = mark.dataset.highlight;
  if (isHighlightColor(attr)) return attr;
  return leadingColorEmoji(mark.textContent ?? "")?.color ?? null;
}

/** Farbe eines Live-Preview-Spans anhand der Klasse cm-highlight-<farbe>. */
export function classColor(el: Element): HighlightColor | null {
  for (const color of HIGHLIGHT_COLORS) if (el.classList.contains(`cm-highlight-${color}`)) return color;
  return null;
}
