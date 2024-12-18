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
    component
  }) {
    // special check for select boxes
    if (component?.type === 'selectboxes') {
      return !_.get(value, comparedValue, false);
    }
    return !_.isEqual(value,comparedValue);
  }
};
