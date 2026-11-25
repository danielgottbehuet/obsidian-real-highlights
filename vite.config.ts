import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Entwicklungsserver für den CodeMirror-Testaufbau (tests/harness) und
 * Vitest-Konfiguration. Website und Playground liegen im Repo real-highlights-site.
 */
export default defineConfig({
  root: resolve(import.meta.dirname, "tests/harness"),
  server: { port: 5173 },
  test: {
    root: import.meta.dirname,
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
