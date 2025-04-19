import { fileURLToPath } from "node:url";

import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";

import svelteConfig from "./svelte.config.js";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

const PROJECT_RULES = {
  quotes: [
    "error",
    "double",
    {
      avoidEscape: true,
      allowTemplateLiterals: true,
    },
  ],

  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      fixStyle: "inline-type-imports",
    },
  ],

  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
      "newlines-between": "always",
      alphabetize: { order: "asc" },
    },
  ],
  "import/first": "error",

  "no-restricted-globals": [
    "error",
    {
      name: "fetch",
      message: "Use fetch from the context provider instead.",
    },
    {
      name: "console",
      message: "Use the logger from the context provider instead.",
    },
  ],

  semi: ["error", "always"],
};

export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    // eslint v9 requires this to be in a separate config option
    ignores: ["**/dist/**/*", "eslint.config.js", "svelte.config.js"],
  },
  ...svelte.configs.recommended,
  eslintConfigPrettier,
  ...svelte.configs.prettier,
  {
    plugins: {
      "@stylistic": stylistic,
      import: importPlugin,
    },
    rules: {
      ...PROJECT_RULES,
      "no-undef": "off",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
);
