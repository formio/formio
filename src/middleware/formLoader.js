'use strict';
var util = require('../util/util');
var async = require('async');

/**
 * Middleware to load a full form if needed.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = function(router) {
  const loadSubForms = function(form, req, next, depth) {
    // Only allow 5 deep.
    if (depth >= 5) {
      return next();
    }

    // Get all of the form components.
    var comps = [];
    util.eachComponent(form.components, function(component) {
      if (component.type === 'form') {
        comps.push(component);
      }
    }, true);

    // Only proceed if we have form components.
    if (!comps || !comps.length) {
      return next();
    }

    // Load each of the forms independently.
    async.each(comps, function(comp, done) {
      router.formio.cache.loadForm(req, null, comp.form, function(err, subform) {
        if (!err) {
          comp.components = subform.components;
          loadSubForms(subform, req, done, depth + 1);
        }
        else {
          done();
        }
      });
    }, next);
  };

  return function formLoader(req, res, next) {
    // Only process on GET request, and if they provide full query.
    if (
      req.method !== 'GET' ||
      !req.query.full ||
      !res.resource ||
      !res.resource.item
    ) {
      return next();
    }

    loadSubForms(res.resource.item, req, next, 0);
  };
};
