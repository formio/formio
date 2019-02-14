const Act = require('form-api/src/resources/Action');
const actions = require('../actions');

module.exports = class Action extends Act {
  constructor(...args) {
    super(...args);
  }

  get actions() {
    return {
      ...super.actions,
      ...actions,
    }
  }
};
