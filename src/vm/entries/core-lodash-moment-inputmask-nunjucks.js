'use strict';

const FormioCore = require("@formio/core");
const _ = require("lodash");
const moment = require("moment");
const inputmask = require("inputmask");
const nunjucks = require('nunjucks');
const {RootShim} = require('../src/RootShim');
const {InstanceShim} = require('../src/InstanceShim');
const {Event} = require('../src/polyfill');
const {environment, sanitize, unescape, dateFilter} = require('../src/nunjucks');

module.exports = {
  util: FormioCore.Utils,
  utils: FormioCore.Utils,
  RootShim,
  InstanceShim,
  Event,
  moment,
  inputmask,
  _,
  nunjucks,
  environment,
  sanitize,
  unescape,
  dateFilter
};
