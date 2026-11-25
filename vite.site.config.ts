import { defineConfig } from "vite";
import { resolve } from "node:path";

/** Landingpage für GitHub Pages (src/site → dist/pages). */
export default defineConfig({
  root: resolve(import.meta.dirname, "src/site"),
  base: "./",
  build: {
    outDir: resolve(import.meta.dirname, "dist/pages"),
    emptyOutDir: true,
  },
  server: { port: 5174 },
});
