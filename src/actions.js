'use strict';

const request = require('request-promise-native');

module.exports = config => {
  if (!config.actionsUrl) {
    return Promise.resolve({});
  }

  return request({
    uri: config.actionsUrl,
    json: true,
  });
};
