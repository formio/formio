'use strict';

const DateGeaterThan = require('./DateGreaterThan');

module.exports = class DateGreaterThanOrEqual extends DateGeaterThan {
  static get operatorKey() {
    return 'dateGreaterThanOrEqual';
  }

  static get displayedName() {
    return 'Greater Than Or Equal To';
  }

  execute(options) {
    return super.execute(options,'isSameOrAfter');
  }
};
