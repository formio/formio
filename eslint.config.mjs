import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import("eslint").Linter.Config} */
export default [
  {
    ignores: [
      'test/',
      'app/',
      'portal/',
      'src/db/updates/',
      'src/vm/bundles/',
      'node_modules/',
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    rules: {
      'no-prototype-builtins': 'off',
      'no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^ignore',
        },
      ],
    },
  },
];
