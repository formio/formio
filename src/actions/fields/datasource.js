'use strict';
const _ = require('lodash');
const request = require('request-promise-native');
const FormioUtils = require('formiojs/utils').default;
const util = require('../../util/util');

module.exports = formio => {
  const before = function(component, path, validation, req, res, next) {
    // Only perform before validation has occurred.
    if (!validation) {
      return next();
    }

    // If there is no body, don't continue.
    if (!req.body.data) {
      return next();
    }
    // If not set to trigger on server, skip.
    if (!_.get(component, 'trigger.server', false)) {
      return next();
    }

    const requestHeaders = {};
    const token = util.getRequestValue(req, 'x-jwt-token');
    switch (component.dataSrc || 'url') {
      case 'url':
        // Set custom headers.
        if (component.fetch && component.fetch.headers) {
          _.each(component.fetch.headers, (header) => {
            if (header.key) {
              requestHeaders[header.key] = header.value;
            }
          });
        }

        // Set form.io authentication.
        if (component.fetch && component.fetch.authenticate && token) {
          requestHeaders['x-jwt-token'] = token;
        }

        request({
          uri: FormioUtils.interpolate(this.component.fetch.url, {data: req.body.data}),
          method: (this.component.fetch.method || 'get').toUpperCase(),
          headers: requestHeaders,
          json: true,
        })
          .then((value) => {
            if (value) {
              _.set(req.body, `data.${path}`, value);
            }
            return next();
          });
        break;
      case 'custom':
        // TODO: Implement custom async code?
        return next();
      default:
        return next();
    }
  };

  return {
    beforePut: before,
    beforePost: before
  };
};
