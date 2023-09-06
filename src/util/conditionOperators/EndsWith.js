'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class EndsWith extends ConditionOperator {
  static get operatorKey() {
    return 'endsWith';
  }

  static get displayedName() {
    return 'Ends With';
  }

  execute({
    value,
    comparedValue,
  }) {
    return _.endsWith(value,comparedValue);
  }
};
