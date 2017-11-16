'use strict';
const _get = require('lodash/get');
const _each = require('lodash/each');
const request = require('request');
const util = require('../../util/util');
const FormioUtils = require('formiojs/utils');

module.exports = function(formio) {
  const validationRequest = function(component, path, req, res, next) {
    const value = _get(req.body, 'data.' + path);

    // Empty values are fine.
    if (!value) {
      return next();
    }

    // Initialize the request options.
    let options = {
      url: _get(component, 'validate.select'),
      method: 'GET',
      qs: {},
      json: true,
      headers: {}
    };

    // If the url is a boolean value.
    if (util.isBoolean(options.url)) {
      options.url = util.boolean(options.url);
      if (!options.url) {
        return next();
      }

      if (component.dataSrc !== 'url') {
        return next();
      }

      if (!component.data.url || !component.searchField) {
        return next();
      }

      // Get the validation url.
      options.url = component.data.url;

      // Add the search field.
      options.qs[component.searchField] = value;

      // Add the filters.
      if (component.filter) {
        options.url += (!options.url.includes('?') ? '?' : '&') + component.filter;
      }

      // If they only wish to return certain fields.
      if (component.selectFields) {
        options.qs.select = component.selectFields;
      }
    }

    if (!options.url) {
      return next();
    }

    // Make sure to interpolate.
    options.url = FormioUtils.interpolate(options.url, {
      data: req.body
    });

    // Set custom headers.
    if (component.data && component.data.headers) {
      _each(component.data.headers, (header) => {
        if (header.key) {
          options.headers[header.key] = header.value;
        }
      });
    }

    // Set form.io authentication.
    if (component.authenticate) {
      const token = util.getRequestValue(req, 'x-jwt-token');
      if (token) {
        options.headers['x-jwt-token'] = token;
      }
    }

    // Make the request.
    request(options, (err, response, body) => {
      if (err) {
        return next(err);
      }

      if (response && parseInt(response.statusCode / 100, 10) !== 2) {
        return res.status(response.statusCode).send(body);
      }

      if (!body || !body.length) {
        return res.status(400).json({
          name: 'ValidationError',
          details: [
            {
              message: '"' + value + '" for "' + (component.label || component.key) + '" is not a valid selection.',
              path: [path],
              type: 'select'
            }
          ],
          _object: req.body.data
        });
      }

      // This is a valid selection.
      return next();
    });
  };

  return {
    beforePut: function(component, path, validation, req, res, next) {
      if (validation) {
        return next();
      }

      return validationRequest(component, path, req, res, next);
    },

    beforePost: function(component, path, validation, req, res, next) {
      if (validation) {
        return next();
      }

      return validationRequest(component, path, req, res, next);
    }
  };
};
