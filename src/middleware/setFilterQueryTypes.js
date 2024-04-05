'use strict';

const _ = require('lodash');
const util = require('../util/util');
const moment = require('moment');

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

      router.formio.cache.loadCurrentForm(req, (err, currentForm) => {
        if (err) {
          return next(err);
        }

        const prefix = 'data.';
        const prefixLength = prefix.length;
        _.assign(req.query, _(req.query)
          .omit('limit', 'skip', 'select', 'sort', 'populate')
          .mapValues((value, name) => {
            // Skip filters not looking at component data
            if (!name.startsWith(prefix)) {
              return value;
            }

            // Get the filter object.
            const filter = _.zipObject(['name', 'selector'], name.split('__'));
            // Convert to component key
            const key = util.getFormComponentKey(filter.name).substring(prefixLength);
            const component = util.getComponent(currentForm.components, key);
            // Coerce these queries to proper data type
            if (component) {
              switch (component.type) {
                case 'number':
                case 'currency':
                  return Number(value);
                case 'checkbox':
                  return value !== 'false';
                case 'datetime': {
                  const date = moment.utc(value, ['YYYY-MM-DD', 'YYYY-MM', 'YYYY', 'x', moment.ISO_8601], true);

                  if (date.isValid()) {
                    return date.toDate();
                  }
                  return;
                }
                case 'select': {
                  if (Number(value) || value === "0") {
                    return Number(value);
                  }
                }
              }
            }
            if (!component && ['true', 'false'].includes(value)) {
              return value !== 'false';
            }
            return value;
          })
          .value()
        );

        next();
      });
    };
};
