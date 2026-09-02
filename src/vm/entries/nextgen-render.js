'use strict';

// Isolate environment bundle for the ENCAPSULATED nextgen validation render:
// the whole `createHeadlessForm` orchestration runs inside the sandbox, so the
// renderer, its data-access client, the output-collection helpers, and the
// custom-JS globals (_/moment) all have to be reachable as isolate globals.
// Built by webpack.nextgen.vm.config.js into bundles/nextgen-render.js.
// Load the isolate env shims (timers, document/window, performance) first, for
// their global side effects, before the renderer module graph initializes.
require('../nextgen/polyfill');
const _ = require('lodash');
const moment = require('moment');
const {
  createHeadlessForm,
  Formio,
  eachInstance,
  getProtectedPaths,
  snapshot,
  enableLegacySupport,
} = require('@formio/nextgen');
const { defaultUtils } = require('@formio/nextgen/util');
const {
  collectHiddenPaths,
  errorsRecordToDetails,
  collectEmailRenderData,
} = require('../nextgen/serverHelpers');

// Server custom JS references `_`/`moment` as free variables, and legacy JSON
// Logic uses the lodash-backed `_<name>` operators. Both are served from the
// lodash bundled here — the isolate cannot fetch a lazily imported chunk.
// (`utils`/`util` need no registration; the renderer supplies them already.)
enableLegacySupport({ _, moment });

module.exports = {
  createHeadlessForm,
  Formio,
  eachInstance,
  getProtectedPaths,
  snapshot,
  collectHiddenPaths,
  errorsRecordToDetails,
  collectEmailRenderData,
  _,
  moment,
  util: defaultUtils,
  utils: defaultUtils,
};
