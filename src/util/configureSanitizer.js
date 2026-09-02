'use strict';

const xss = require('xss');
const { setSanitizer } = require('@formio/nextgen');

// Translate nextgen's DOMPurify sanitizationConfig (ALLOWED_TAGS/ALLOWED_ATTR)
// into xss whiteList form. In headless mode the config is always the default
// (it's a render option, not part of the form definition); translating it keeps
// server-side sanitization aligned with the client's DOMPurify allowlist.
function toXssOptions(config) {
  const cfg = config || {};
  const options = {};
  if (cfg.ALLOWED_TAGS) {
    const attrs = cfg.ALLOWED_ATTR || [];
    const whiteList = {};
    for (const tag of cfg.ALLOWED_TAGS) {
      whiteList[tag] = attrs;
    }
    options.whiteList = whiteList;
  }
  if (cfg.ALLOW_DATA_ATTR) {
    options.onIgnoreTagAttr = (tag, name, value) =>
      name.indexOf('data-') === 0 ? `${name}="${xss.escapeAttrValue(value)}"` : undefined;
  }
  return options;
}

/**
 * Register a DOM-free (xss-based) sanitizer with nextgen so Content/HTML
 * components sanitize correctly when rendered headlessly (email). DOMPurify
 * needs a DOM the server doesn't have; this keeps nextgen from bundling a
 * second sanitizer for browser builds.
 */
function configureSanitizer() {
  setSanitizer((html, config) => xss(html, toXssOptions(config)));
}

module.exports = { configureSanitizer };
