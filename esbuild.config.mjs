/**
 * Baut das Obsidian-Plugin nach dist/obsidian (main.js, manifest.json, styles.css).
 *
 *   node esbuild.config.mjs            einmaliger Produktionsbuild
 *   node esbuild.config.mjs --watch    Watch-Modus für die Entwicklung
 *
 * Mit OBSIDIAN_PLUGIN_DIR=<vault>/.obsidian/plugins/real-highlights wird zusätzlich
 * dorthin kopiert.
 */
import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const watch = process.argv.includes("--watch");
const outDir = "dist/obsidian";
const targets = [outDir, process.env.OBSIDIAN_PLUGIN_DIR].filter(Boolean);

const copyAssets = {
  name: "copy-assets",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;
      for (const dir of targets) {
        mkdirSync(dir, { recursive: true });
        copyFileSync("manifest.json", join(dir, "manifest.json"));
        copyFileSync("src/obsidian/styles.css", join(dir, "styles.css"));
        if (dir !== outDir) copyFileSync(join(outDir, "main.js"), join(dir, "main.js"));
      }
      console.log(`[real-highlights] build ok -> ${targets.join(", ")}`);
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/obsidian/main.ts"],
  bundle: true,
  outfile: join(outDir, "main.js"),
  format: "cjs",
  platform: "browser",
  target: "es2020",
  // Von Obsidian zur Laufzeit bereitgestellt.
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  treeShaking: true,
  logLevel: "info",
  plugins: [copyAssets],
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
