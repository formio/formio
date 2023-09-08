'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class LessThanOrEqual extends ConditionOperator {
  static get operatorKey() {
    return 'lessThanOrEqual';
  }

  static get displayedName() {
    return 'Less Than Or Equal To';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.isNumber(value) && (value < comparedValue || _.isEqual(value,comparedValue));
  }
};
