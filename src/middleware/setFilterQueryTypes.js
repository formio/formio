'use strict';

var _ = require('lodash');
var _property = require('lodash.property');
var _words = require('lodash.words');
var debug = require('debug')('formio:middleware:setFilterQueryTypes');
var util = require('../util/util');


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
    return function (req, res, next) {
      // Skip if not an Index request
      if(req.method !== 'GET' || req.submissionId) {
        next();
      }

      router.formio.cache.loadCurrentForm(req, function(err, currentForm) {
        if(err) {
          return next(err);
        }

        _.assign(req.query, _(req.query)
          .omit('limit', 'skip', 'select', 'sort')
          .mapValues(function(value, name) {
            // Skip filters not looking at component data
            if(name.indexOf('data.') !== 0) {
              return value;
            }

            // Get the filter object.
            var filter = _.zipObject(['name', 'selector'], _words(name, /[^,_ ]+/g));
            // Convert to component key
            var key = util.getFormComponentKey(filter.name).substring(5);
            var component = util.getComponent(currentForm.components, key);
            // Coerce these queries to proper data type
            if(component) {
              if(component.type === 'number') {
                return Number(value);
              }
              if(component.type === 'checkbox') {
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
