'use strict';

const _ = require('lodash');

/* eslint-disable no-unused-vars */
module.exports = class ConditionOperator {
  static get operatorKey() {
    return '';
  }

  static get displayedName() {
    return '';
  }

  static get requireValue() {
    return true;
  }

  execute() {
    return true;
  }

  getResult(options = {}) {
    const {value} = options;

    if (_.isArray(value)) {
      return _.some(
        value,
        valueItem => this.execute({
          ...options,
          value: valueItem,
        }),
      );
    }

    return this.execute(options);
  }
};
