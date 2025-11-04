import { config } from '@formio/eslint-config/base';

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
  ...config,
];
