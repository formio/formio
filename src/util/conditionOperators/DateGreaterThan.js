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
    const date = moment(value);
    const comparedDate = moment(comparedValue);

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
