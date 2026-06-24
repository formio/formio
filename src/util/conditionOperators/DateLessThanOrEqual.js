'use strict';

const DateGeaterThan = require('./DateGreaterThan');

module.exports = class DateLessThanOrEqual extends DateGeaterThan {
  static get operatorKey() {
    return 'dateLessThanOrEqual';
  }

  static get displayedName() {
    return 'Less Than Or Equal To';
  }

  execute(options) {
    return super.execute(options,'isSameOrBefore');
  }
};
