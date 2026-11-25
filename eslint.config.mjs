// Entspricht der Konfiguration des Obsidian-Community-Scanners
// (eslint-plugin-obsidianmd, "Full scanner-equivalent configuration"),
// damit `npm run lint` dieselben Befunde liefert wie die automatische Prüfung.
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  ...obsidianmd.configs.recommended,

  {
    files: ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"],
    rules: {
      // Security – wie im Scanner als Fehler
      "no-eval": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/no-forbidden-elements": "error",

      // Im Scanner abgeschaltet
      "no-undef": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "import/no-unresolved": "off",
      "obsidianmd/commands/no-command-in-command-id": "off",
      "obsidianmd/commands/no-plugin-id-in-command-id": "off",
    },
  },
  {
    files: ["**/*.{ts,cts,mts,tsx}"],
    rules: {
      "@typescript-eslint/no-implied-eval": "error",
    },
  },
  {
    files: ["manifest.json"],
    rules: { "obsidianmd/validate-manifest": "off" },
  },
  {
    files: ["LICENSE", "LICENSE.md", "LICENSE.txt"],
    rules: { "obsidianmd/validate-license": "off" },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
      reportUnusedInlineConfigs: "off",
    },
  },

  // Wie im Scanner ausgenommen: Build-Ausgabe, Test-Vault, Tests, Build-Skripte, Doku.
  globalIgnores([
    "main.js",
    "**/*.min.js",
    "**/{dist,build,out,release}/**/*.{js,cjs,mjs,jsx}",
    "node_modules",
    "dist",
    "build",
    "pkg",
    "test-vault",
    ".obsidian",
    "**/.obsidian/**",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "**/*.test.*",
    "**/tests/**",
    "**/*.cjs",
    "**/*.mjs",
    "**/vite*",
    "**/docs/**",
  ]),
]);
