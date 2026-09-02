'use strict';

const fs = require('fs');

/**
 * Load an operator-provided extensions module that registers custom nextgen
 * components. Mounted into the container at FORMIO_EXTENSIONS_PATH (default
 * /app/extensions.js); default-exports ({ registerComponent, defineComponent, h }) => void.
 * A component's own `html` render mode is what makes it appear in emails — no
 * separate email registration. No-op when the file is absent.
 */
function loadExtensions() {
  const path = process.env.FORMIO_EXTENSIONS_PATH || '/app/extensions.js';
  if (!fs.existsSync(path)) {
    return;
  }

  const { registerComponent, defineComponent, h } = require('@formio/nextgen');
  const mod = require(path);
  const fn = mod && (mod.default || mod);
  if (typeof fn !== 'function') {
    console.warn(`[extensions] ${path} did not export a function; skipping`);
    return;
  }

  fn({ registerComponent, defineComponent, h });
}

module.exports = { loadExtensions };
