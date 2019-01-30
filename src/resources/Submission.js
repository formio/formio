const Sub = require('form-manager/src/resources/Submission');
const actions = require('../actions');

module.exports = class Submission extends Sub {
  get actions() {
    return {
      ...super.actions,
      ...actions,
    }
  }
};
