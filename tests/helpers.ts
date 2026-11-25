/** Prüft ein SVG auf ungültige Zahlen und grundlegende Wohlgeformtheit. */
export function assertValidSvg(svg: string): void {
  if (/NaN|Infinity|undefined/.test(svg)) throw new Error("SVG enthält ungültige Werte: " + svg.slice(0, 200));
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) throw new Error("SVG nicht wohlgeformt");
  // Alle Pfaddaten dürfen nur Befehle und Zahlen enthalten.
  for (const m of svg.matchAll(/ d="([^"]*)"/g)) {
    if (!/^[MLCZ0-9.\-\s]*$/.test(m[1])) throw new Error("Ungültige Pfaddaten: " + m[1].slice(0, 80));
  }
  const open = (svg.match(/<(?!\/)[a-zA-Z]/g) ?? []).length;
  const selfClosing = (svg.match(/\/>/g) ?? []).length;
  const close = (svg.match(/<\//g) ?? []).length;
  if (open !== selfClosing + close) throw new Error(`Tags unausgeglichen: ${open} vs ${selfClosing}+${close}`);
}
