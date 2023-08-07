'use strict';

const _ = require('lodash');

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
module.exports = (router) => (settings) => function(req, res, next) {
  if (!_.isObject(settings) || !settings.field || !_.isBoolean(settings.isNull)) {
    return next();
  }

  // Build the dynamic mongoose query.
  const query = {};

  const findQuery = settings.resource
    ? router.formio.resources[settings.resource].getFindQuery(req)
    : {};

  if (!findQuery.hasOwnProperty(settings.field)) {
    // Set the exist modifier.
    const exists = settings.isNull
      ? {$eq: null}
      : {$ne: null};

    query[settings.field] = exists;
  }

  req.modelQuery = req.modelQuery || req.model || this.model;
  req.modelQuery = req.modelQuery.find(query);

  req.countQuery = req.countQuery || req.model || this.model;
  req.countQuery = req.countQuery.find(query);

  next();
};
