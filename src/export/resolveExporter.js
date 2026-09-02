'use strict';

const exporters = require('.');
const util = require('../util/util');

module.exports = (format, hook) =>
  format === 'csv' && util.isNextgenValidatorEnabled(hook)
    ? require('./exporters/NextgenCSVExporter')
    : exporters[format];
