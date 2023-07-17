'use strict';

const Includes = require('./Includes');

module.exports = class NotIncludes extends Includes {
  static get operatorKey() {
    return 'notIncludes';
  }

  static get displayedName() {
    return 'Not Includes';
  }

  execute(options) {
    return !super.execute(options);
  }
};
