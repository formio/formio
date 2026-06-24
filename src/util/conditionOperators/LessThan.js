'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class LessThan extends ConditionOperator {
  static get operatorKey() {
    return 'lessThan';
  }

  static get displayedName() {
    return 'Less Than';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.isNumber(value) && value < comparedValue;
  }
};
