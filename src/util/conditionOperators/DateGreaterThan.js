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
    let validationFormat = component.dayFirst ? 'DD-MM-YYYY' : 'MM-DD-YYYY';
    if (component.fields?.day?.hide) {
      validationFormat = validationFormat.replace('DD-', '');
    }
    if (component.fields?.month?.hide) {
      validationFormat = validationFormat.replace('MM-', '');
    }

    if ( component.fields?.year?.hide ) {
      validationFormat = validationFormat.replace('-YYYY', '');
    }

    return validationFormat;
  }

  setDateFormat(component) {
    return component?.type === 'day' ? this.getValidationFormat(component) : '';
  }

  getFormattedDates({
    value,
    comparedValue,
    component
  }) {
    const dateFormat = this.setDateFormat(component);
    const date = moment(value, dateFormat);
    const comparedDate = moment(comparedValue, dateFormat);

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
