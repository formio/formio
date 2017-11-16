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

    // Get all of the form components.
    var comps = [];
    util.eachComponent(res.resource.item.components, function(component) {
      if (component.type === 'form') {
        comps.push(component);
      }
    });

    // Only proceed if we have form components.
    if (!comps || !comps.length) {
      return next();
    }

    // Load each of the forms independently.
    async.each(comps, function(comp, done) {
      router.formio.cache.loadForm(req, null, comp.form, function(err, form) {
        if (err) {
          return done(err);
        }
        comp.components = form.components;
        done();
      });
    }, next);
  };
};
