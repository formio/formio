import { config } from '@formio/eslint-config/base';
import { config as loggingConfig } from '@formio/eslint-config/logging';

/** @type {import("eslint").Linter.Config} */
export default [
  {
    ignores: ['test/', 'app/', 'portal/', 'src/db/updates/', 'src/vm/bundles/', 'node_modules/'],
  },
  ...config,
  ...loggingConfig,
];
