import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "src/playground");

export default defineConfig({
  root,
  base: "./",
  build: {
    outDir: resolve(import.meta.dirname, "dist/playground"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        lab: resolve(root, "lab.html"),
      },
    },
  },
  server: { port: 5173 },
  test: {
    root: import.meta.dirname,
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
