'use strict';
const fs = require('fs');
const path = require('path');

const CORE_LODASH_MOMENT_INPUTMASK = fs.readFileSync(
  path.resolve(__dirname, 'core-lodash-moment-inputmask.js'),
  'utf8'
);
const CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS = fs.readFileSync(
  path.resolve(__dirname, 'core-lodash-moment-inputmask-nunjucks.js'),
  'utf-8'
);

module.exports = {CORE_LODASH_MOMENT_INPUTMASK, CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS};
