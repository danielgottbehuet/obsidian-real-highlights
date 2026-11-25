/**
 * Stroke Lab: große Einzelstriche aller Presets zur Detailbewertung
 * (Kanten, Keilspitze, Fasern, Tintenansammlung).
 */
import { MARKER_PRESETS, adaptConfigForTheme, generateMarker, presetConfig } from "../engine";

const sheets = document.getElementById("sheets")!;
const hInput = document.getElementById("h") as HTMLInputElement;
const sInput = document.getElementById("s") as HTMLInputElement;
const darkInput = document.getElementById("dark") as HTMLInputElement;
const debugInput = document.getElementById("debug") as HTMLInputElement;

const WORDS = ["Textmarker", "kurz", "Eine deutlich längere markierte Passage"];

function render(): void {
  const h = Number(hInput.value);
  const dark = darkInput.checked;
  sheets.innerHTML = "";
  for (const preset of MARKER_PRESETS) {
    const sheet = document.createElement("div");
    sheet.className = "sheet" + (dark ? " dark" : "");
    let y = 26;
    let html = `<div class="label" style="top:6px">${preset.name}</div>`;
    for (const word of WORDS) {
      const probe = document.createElement("span");
      probe.className = "word";
      probe.style.cssText = `font-size:${h * 0.78}px;line-height:${h}px;visibility:hidden`;
      probe.textContent = word;
      document.body.appendChild(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      const cfg = adaptConfigForTheme(presetConfig(preset.id), dark ? "dark" : "light");
      const res = generateMarker({
        ...cfg,
        text: word + ":" + sInput.value,
        width,
        height: h,
        debug: debugInput.checked,
      });
      const x = h * 0.8;
      html += `<div class="stroke" style="left:${x + res.offsetX}px;top:${y + res.offsetY}px">${res.svg}</div>`;
      html += `<div class="word" style="left:${x}px;top:${y}px;font-size:${h * 0.78}px;line-height:${h}px">${word}</div>`;
      y += h * 1.45;
    }
    sheet.innerHTML = html;
    sheet.style.height = `${y + 10}px`;
    sheets.appendChild(sheet);
  }
}

for (const el of [hInput, sInput, darkInput, debugInput]) el.addEventListener("input", render);
document.fonts?.ready.then(render);
render();
