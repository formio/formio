'use strict';

const IsEmptyValue = require('./IsEmptyValue');

module.exports = class IsNotEmptyValue extends IsEmptyValue {
  static get operatorKey() {
    return 'isNotEmpty';
  }

  static get displayedName() {
    return 'Is Not Empty';
  }

  getResult(options) {
    return !super.getResult(options);
  }
};
