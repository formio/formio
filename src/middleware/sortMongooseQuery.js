'use strict';

/**
 * Middleware to sort the Mongoose query, using the provided settings,
 *
 * @param router
 * @param settings
 * @see http://mongoosejs.com/docs/api.html#query_Query-sort
 *
 * @returns {Function}
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  return function(settings) {
    return function sortMongooseQuery(req, res, next) {
      // Only filter on non empty objects.
      if (typeof settings !== 'object' || settings === {}) {
        return next();
      }

      /**
       * NOTE: Due to the in-ability to index on case insensitive strings, this will return results in the order:
       *  1. Numerics 0-9
       *  2. Uppercase characters
       *  3. Lowercase characters
       *
       * @see https://jira.mongodb.org/browse/SERVER-90
       */
      req.modelQuery = req.modelQuery || req.model || this.model;
      req.modelQuery = req.modelQuery.find(hook.alter('roleQuery', {}, req)).sort(settings);

      next();
    };
  };
};
