import type { MarkerConfig, MarkerLayers } from "./MarkerOptions";
import type { InkTexture } from "./InkTexture";
import type { StrokeGeometry } from "./StrokeGeometry";
import { fmt } from "./StrokeGeometry";

export interface RenderInput {
  idPrefix: string;
  seed: number;
  version: string;
  geo: StrokeGeometry;
  ink: InkTexture;
  cfg: MarkerConfig;
  layers: MarkerLayers;
  debug: boolean;
}

function gray(v: number): string {
  const h = Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${h}${h}${h}`;
}

/** Sicheres Attribut-Escaping (IDs werden zusätzlich auf [A-Za-z0-9_-] beschränkt). */
export function sanitizeId(id: string): string {
  const s = id.replace(/[^A-Za-z0-9_-]/g, "");
  return /^[A-Za-z_]/.test(s) ? s : "rm" + s;
}

/**
 * Führt die Rendering-Ebenen zu einem eigenständigen SVG zusammen.
 *
 * Aufbau: Eine Luminanzmaske beschreibt den Tintenauftrag (Grundfläche mit
 * Druck-/Ansammlungsverlauf, dunklere Ränder, Fasern, Körnung). Darauf wird eine
 * einfarbige Fläche in Markerfarbe maskiert. Der Text liegt außerhalb dieses SVGs.
 */
export function renderSvg(input: RenderInput): string {
  const { geo, ink, cfg, layers, debug } = input;
  const p = sanitizeId(input.idPrefix);
  const b = geo.bounds;
  const H = geo.strokeHeight;
  const rect = `x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"`;
  const cy = geo.centerAt((geo.startX + geo.endX) / 2);
  const skewDeg = (Math.atan2(geo.tipShift, H) * 180) / Math.PI;

  const defs: string[] = [];
  const maskContent: string[] = [];

  defs.push(`<clipPath id="${p}-c" clipPathUnits="userSpaceOnUse"><path d="${geo.outline}"/></clipPath>`);

  // Ebene 1: Grundfläche mit Anpressdruck und Tintenansammlung.
  if (layers.base) {
    const stops = ink.stops
      .map((s) => `<stop offset="${fmt(s.offset * 100)}%" stop-color="${gray(s.intensity)}"/>`)
      .join("");
    defs.push(
      `<linearGradient id="${p}-g" gradientUnits="userSpaceOnUse" x1="${fmt(geo.startX)}" y1="0" x2="${fmt(geo.endX)}" y2="0"` +
        ` gradientTransform="translate(0 ${fmt(cy)}) skewX(${fmt(-skewDeg)}) translate(0 ${fmt(-cy)})">${stops}</linearGradient>`,
    );
    maskContent.push(`<path d="${geo.outline}" fill="url(#${p}-g)"/>`);
  }

  const clipped: string[] = [];

  // Ebene 2: Dunklere Ränder (Tinte sammelt sich an den Kanten der Keilspitze).
  for (const e of ink.edges) {
    clipped.push(
      `<path d="${geo.outline}" fill="none" stroke="#fff" stroke-opacity="${fmt(e.opacity)}" stroke-width="${fmt(e.width)}" stroke-linejoin="round"/>`,
    );
  }

  // Ebene 3: Faserstruktur.
  for (const f of ink.fibers) {
    clipped.push(
      `<path d="${f.d}" fill="none" stroke="${f.kind === "dark" ? "#fff" : "#000"}" stroke-opacity="${Math.round(f.opacity * 1000) / 1000}" stroke-width="${fmt(f.width)}" stroke-linecap="round"/>`,
    );
  }

  // Ebene 4: Feine Tintenstruktur (deterministisches feTurbulence mit festem Seed).
  if (ink.grain) {
    const g = ink.grain;
    defs.push(
      `<filter id="${p}-f" filterUnits="userSpaceOnUse" ${rect} color-interpolation-filters="sRGB">` +
        `<feTurbulence type="fractalNoise" baseFrequency="${g.baseFrequencyX.toFixed(4)} ${g.baseFrequencyY.toFixed(4)}" numOctaves="3" seed="${g.seed}"/>` +
        `<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${g.slope.toFixed(4)} 0 0 0 ${g.intercept.toFixed(4)}"/>` +
        `</filter>`,
    );
    clipped.push(`<rect ${rect} filter="url(#${p}-f)"/>`);
  }

  if (clipped.length) maskContent.push(`<g clip-path="url(#${p}-c)">${clipped.join("")}</g>`);

  defs.push(
    `<mask id="${p}-m" maskUnits="userSpaceOnUse" ${rect} style="mask-type:luminance" color-interpolation="sRGB">${maskContent.join("")}</mask>`,
  );

  const body = [`<rect ${rect} fill="${cfg.color}" fill-opacity="${fmt(cfg.opacity)}" mask="url(#${p}-m)"/>`];

  if (debug) body.push(renderDebug(geo));

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${b.width}" height="${b.height}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}"` +
    ` data-seed="${input.seed}" data-version="${input.version}" style="overflow:visible;mix-blend-mode:${cfg.blendMode}">` +
    `<defs>${defs.join("")}</defs>${body.join("")}</svg>`
  );
}

function renderDebug(geo: StrokeGeometry): string {
  const r = Math.max(0.8, geo.strokeHeight * 0.04);
  const pts = [...geo.top, ...geo.bottom]
    .map((pt) => `<circle cx="${fmt(pt.x)}" cy="${fmt(pt.y)}" r="${fmt(r)}"/>`)
    .join("");
  const steps = Math.max(2, geo.top.length);
  let center = "";
  for (let i = 0; i <= steps; i++) {
    const x = geo.startX + ((geo.endX - geo.startX) * i) / steps;
    center += `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(geo.centerAt(x))}`;
  }
  return (
    `<g class="rm-debug" style="mix-blend-mode:normal">` +
    `<path d="${geo.outline}" fill="none" stroke="#e0245e" stroke-width="0.75"/>` +
    `<path d="${center}" fill="none" stroke="#1d7fd8" stroke-width="0.75" stroke-dasharray="3 2"/>` +
    `<g fill="#1d7fd8">${pts}</g>` +
    `<line x1="${fmt(geo.startX)}" x2="${fmt(geo.startX)}" y1="${fmt(geo.bounds.y)}" y2="${fmt(geo.bounds.y + geo.bounds.height)}" stroke="#16a34a" stroke-width="0.75"/>` +
    `<line x1="${fmt(geo.endX)}" x2="${fmt(geo.endX)}" y1="${fmt(geo.bounds.y)}" y2="${fmt(geo.bounds.y + geo.bounds.height)}" stroke="#16a34a" stroke-width="0.75"/>` +
    `</g>`
  );
}
