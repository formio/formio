import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import reactHooks from 'eslint-plugin-react-hooks';

import eslintPluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: {...globals.browser, CONFIG: "readonly"}} },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  reactHooks.configs['recommended-latest'],
  eslintConfigPrettier,
];
