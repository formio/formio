'use strict';

const FormioCore = require("@formio/core");
const _ = require("lodash");
const moment = require("moment");
const inputmask = require('inputmask');
const {RootShim} = require('../src/RootShim');
const {InstanceShim} = require('../src/InstanceShim');
const {Event} = require('../src/polyfill');

module.exports = {util: FormioCore.Utils, utils: FormioCore.Utils, RootShim, InstanceShim, Event, moment, _, inputmask};
