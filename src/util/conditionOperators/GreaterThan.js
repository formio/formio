'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class GeaterThan extends ConditionOperator {
  static get operatorKey() {
    return 'greaterThan';
  }

  static get displayedName() {
    return 'Greater Than';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.isNumber(value) && value > comparedValue;
  }
};
