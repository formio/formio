'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class IsEqualTo extends ConditionOperator {
  static get operatorKey() {
    return 'isEqual';
  }

  static get displayedName() {
    return 'Is Equal To';
  }

  execute({ value, comparedValue, component }) {
    // special check for select boxes
    if (component?.type === 'selectboxes') {
      return _.get(value, comparedValue, false);
    }

    if (
      value &&
      comparedValue &&
      typeof value !== typeof comparedValue &&
      _.isString(comparedValue)
    ) {
      try {
        comparedValue = JSON.parse(comparedValue);
      } catch (ignoreErr) {
         // ignore
      }
    }

    return _.isEqual(value, comparedValue);
  }
};
