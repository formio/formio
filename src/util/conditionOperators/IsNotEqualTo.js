'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class IsNotEqualTo extends ConditionOperator {
  static get operatorKey() {
    return 'isNotEqual';
  }

  static get displayedName() {
    return 'Is Not Equal To';
  }

  execute({
    value,
    comparedValue,
  }) {
    return !_.isEqual(value,comparedValue);
  }
};
