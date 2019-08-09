'use strict';

const request = require('request-promise-native');
const { classes } = require('form-api');

module.exports = config => class RemoteAction extends classes.Action {
  static info() {
    return config.info;
  }

  static settingsForm(options) {
    return super.settingsForm(options, config.settingsForm);
  }

  static get serverOnly() {
    return true;
  }

  async resolve(handler, method, submission, req, res, setActionInfoMessage) {
    return Promise.resolve('Yay');
  }
};
