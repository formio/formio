'use strict';

const DateGeaterThan = require('./DateGreaterThan');

module.exports = class IsDateEqual extends DateGeaterThan {
  static get operatorKey() {
    return 'isDateEqual';
  }

  static get displayedName() {
    return 'Is Equal To';
  }

  execute(options) {
    return super.execute(options,'isSame');
  }
};
