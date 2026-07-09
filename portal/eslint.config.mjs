import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

import eslintPluginReact from 'eslint-plugin-react';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        CONFIG: 'readonly',
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  eslintConfigPrettier,
  {
    settings: { react: { version: 'detect' } },
    rules: {
      // TypeScript handles prop validation; PropTypes are not used in this app.
      'react/prop-types': 'off',
      // Matches the monorepo convention (see apps/pdf-server): `any` is discouraged
      // but not a hard error.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
