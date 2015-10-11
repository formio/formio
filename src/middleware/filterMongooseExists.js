'use strict';

var debug = require('debug')('formio:middleware:filterMongooseExists');

/**
 * Middleware to filter the Mongoose query for the existance of a field, using the provided settings,
 *
 * @param router
 * @param settings
 *   settings.field {string} The field in which to search for.
 *   settings.isNull {boolean} Whether or not the field contains a non-null value.
 *
 * @returns {Function}
 */
module.exports = function(router) {
  return function(settings) {
    return function(req, res, next) {
      // Only filter on non empty objects.
      debug(settings);
      if (!settings || typeof settings !== 'object' || settings === {}) {
        return next();
      }
      // Verify the field settings.
      if (!settings.hasOwnProperty('field') || !settings.field) {
        return next();
      }
      // Verify the existance settings.
      if (!settings.hasOwnProperty('isNull') || typeof settings.isNull !== 'boolean') {
        return next();
      }

      // Set the exist modifier.
      var exists = settings.isNull
        ? {$eq: null}
        : {$ne: null};

      // Build the dynamic mongoose query.
      var query = {};
      query[settings.field] = exists;

      debug(query);
      req.modelQuery = req.modelQuery || this.model;
      req.modelQuery = req.modelQuery.find(query);

      req.countQuery = req.countQuery || this.model;
      req.countQuery = req.countQuery.find(query);

      next();
    };
  };
};
