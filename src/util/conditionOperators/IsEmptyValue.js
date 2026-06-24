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
    // lodash treats Date as an empty object
    const isEmptyObject = _.isObject(value) && _.isEmpty(value) && !(value instanceof Date);
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    const isEmptyArray = _.isArray(value) && value.length === 1 && isSimpleEmptyValue(value[0]);
    const isEmptyDate = value instanceof Date && value.toString() === 'Invalid Date';

    if (isSimpleEmptyValue(value) ||
      isEmptyObject ||
      isEmptyString ||
      isEmptyArray ||
      isEmptyDate
    ) {
      return true;
    }
    else if (component?.type === 'selectboxes') {
      let empty = true;
      for (const key in value) {
        if (value.hasOwnProperty(key) && value[key]) {
          empty = false;
          break;
        }
      }
      return empty;
    }
    else if (component?.type === 'address' && value?.address) {
      return _.isEmpty(value.address);
    }

    return false;
  }

  getResult(options) {
    return this.execute(options);
  }
};
