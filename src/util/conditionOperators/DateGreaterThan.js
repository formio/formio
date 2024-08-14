'use strict';

const ConditionOperator = require('./ConditionOperator');
const moment = require('moment');

module.exports = class DateGeaterThan extends ConditionOperator {
  static get operatorKey() {
    return 'dateGreaterThan';
  }

  static get displayedName() {
    return 'Greater Than';
  }

  getValidationFormat(component) {
    return component.dayFirst ? 'DD-MM-YYYY' : 'MM-DD-YYYY';
  }

  getFormattedDates({
    value,
    comparedValue,
  }) {
    // Additional data processing of the date received from the
    // Day component with disabled day, month or year elements.
    // allows using moments for data comparison date with disabled day, month or year
    const normalizeDate = (dateStr) => {
      if (typeof dateStr === 'string') {
      return dateStr
      .replace(/00\//g, '01/')
      .replace(/\/0000/g, '/0001');
      }
      else {
        return dateStr;
      }
    };

    const date = moment(normalizeDate(value));
    const comparedDate = moment(normalizeDate(comparedValue));

    return {
      date,
      comparedDate,
    };
  }

  execute(options, functionName = 'isAfter') {
    const {
      value,
    } = options;

    if (!value) {
      return false;
    }

    const {
      date,
      comparedDate,
    } = this.getFormattedDates(options);

    if (typeof date[functionName] === 'function') {
      return date[functionName](comparedDate);
    }

    return false;
  }
};
