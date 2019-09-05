'use strict';

const request = require('request-promise-native');
const { classes } = require('@formio/api');

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
    setActionInfoMessage('Starting remote action');

    const headers = {};
    if (config.actionsServerKey) {
      headers.authorization = `Bearer: ${config.actionsServerKey}`;
    }

    const reqMethod = config.method.toUpperCase() === 'USE' ? method : config.info.method;
    const response = await request({
      method: reqMethod,
      uri: config.url,
      json: true,
      headers,
      data: {
        method,
        handler,
        submission,
        context: {
          params: req.context.params,
          resources: req.context.resources,
        }
      }
    });

    // If response is an array, it is a set of results to apply.
    if (Array.isArray(response)) {
      response.forEach(item => {
        console.log(item);
      });
    }

    return;
  }
};
