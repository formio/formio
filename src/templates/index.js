'use strict';

var _ = require('lodash');

module.exports = {
  default: _.cloneDeep(require('./default.json')),
  empty: _.cloneDeep(require('./empty.json'))
};
