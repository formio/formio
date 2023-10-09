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

  execute({
    value,
    comparedValue,
  }) {
    if (value && comparedValue && typeof value !== typeof comparedValue && _.isString(comparedValue)) {
      try {
        comparedValue = JSON.parse(comparedValue);
      }
          // eslint-disable-next-line no-empty
      catch (e) {}
    }

    //special check for select boxes
    if (_.isObject(value) && comparedValue && _.isString(comparedValue)) {
      return value[comparedValue];
    }

    return _.isEqual(value, comparedValue);
  }
};
