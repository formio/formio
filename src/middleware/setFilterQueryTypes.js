'use strict';

const _ = require('lodash');
const util = require('../util/util');

/**
 * Middleware function to coerce filter queries for a submission Index
 * into the right type for that field. Converts queries for Number
 * components into Numbers, and Checkbox into booleans.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
    return function(req, res, next) {
      // Skip if not an Index request
      if (req.method !== 'GET' || req.submissionId) {
        return next();
      }

      router.formio.cache.loadCurrentForm(req, function(err, currentForm) {
        if (err) {
          return next(err);
        }

        _.assign(req.query, _(req.query)
          .omit('limit', 'skip', 'select', 'sort')
          .mapValues(function(value, name) {
            // Skip filters not looking at component data
            if (name.indexOf('data.') !== 0) {
              return value;
            }

            // Get the filter object.
            const filter = _.zipObject(['name', 'selector'], _.words(name, /[^,_ ]+/g));
            // Convert to component key
            const key = util.getFormComponentKey(filter.name).substring(5);
            const component = util.getComponent(currentForm.components, key);
            // Coerce these queries to proper data type
            if (component) {
              if (component.type === 'number') {
                return Number(value);
              }
              if (component.type === 'checkbox') {
                return value !== 'false';
              }
            }
            return value;
          })
          .value()
        );

        next();
      });
    };
};
