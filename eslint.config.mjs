import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "packages/*/data/**",
      "packages/panel/client/dist/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    // TypeScript's own checker handles undefined identifiers; `no-undef` only
    // gets in the way for browser/node globals across the workspace.
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: { "no-undef": "off" },
  },
);
