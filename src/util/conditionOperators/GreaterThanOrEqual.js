'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class GreaterThanOrEqual extends ConditionOperator {
  static get operatorKey() {
    return 'greaterThanOrEqual';
  }

  static get displayedName() {
    return 'Greater Than Or Equal To';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.isNumber(value) && (value > comparedValue || _.isEqual(value,comparedValue));
  }
};
