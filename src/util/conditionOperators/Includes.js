'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class Includes extends ConditionOperator {
  static get operatorKey() {
    return 'includes';
  }

  static get displayedName() {
    return 'Includes';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.includes(value,comparedValue);
  }
};
