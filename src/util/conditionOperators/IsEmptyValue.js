'use strict';

const ConditionOperator = require('./ConditionOperator');
const _ = require('lodash');

module.exports = class IsEmptyValue extends ConditionOperator {
  static get operatorKey() {
    return 'isEmpty';
  }

  static get displayedName() {
    return 'Is Empty';
  }

  static get requireValue() {
    return false;
  }

  execute({
    value,
    instance,
    component,
  }) {
    const isSimpleEmptyValue = (v) => v === null || v === undefined || v === '';

    if (isSimpleEmptyValue(value) ||
        (_.isObject(value) && _.isEmpty(value)) ||
        (typeof value === 'string' && value.trim() === '') ||
        (_.isArray(value) && value.length === 1 && isSimpleEmptyValue(value[0])) ||
        (component && component.type === 'checkbox' && value === false)) {
      return true;
    }
    else if (component && component.type === 'selectboxes') {
      let empty = true;
      for (const key in value) {
        if (value.hasOwnProperty(key) && value[key]) {
          empty = false;
          break;
        }
      }
      return empty;
    }

    return false;
  }

  getResult(options) {
    return this.execute(options);
  }
};
