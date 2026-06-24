'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class StartsWith extends ConditionOperator {
  static get operatorKey() {
    return 'startsWith';
  }

  static get displayedName() {
    return 'Starts With';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.startsWith(value, comparedValue);
  }
};
