'use strict';

const DateGeaterThan = require('./DateGreaterThan');

module.exports = class DateLessThan extends DateGeaterThan {
  static get operatorKey() {
    return 'dateLessThan';
  }

  static get displayedName() {
    return 'Less Than';
  }

  execute(options) {
    return super.execute(options,'isBefore');
  }
};
