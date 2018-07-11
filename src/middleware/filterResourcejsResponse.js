'use strict';

const _ = require('lodash');

/**
 * Middleware function to filter the response from resourcejs.
 *
 * @param router
 * @param {array} settings
 *
 * @returns {Function}
 */
module.exports = function(router) {
  return function(settings) {
    return function(req, res, next) {
      if (!Array.isArray(settings)) {
        return next();
      }
      if (!res || !res.resource || !res.resource.item) {
        return next();
      }

      // Merge all results into an array, to handle the cases with multiple results.
      const multi = Array.isArray(res.resource.item);
      const list = [].concat(res.resource.item).map((item) => {
        // Change the response object from a mongoose model to a js object.
        if (item.constructor.name === 'model') {
          item = item.toObject();
        }

        return _.omit(item, settings);
      });

      // If there were multiple results, update the response list, otherwise return only the original item.
      if (multi) {
        res.resource.item = list;
        return next();
      }
      else {
        res.resource.item = list[0];
        return next();
      }
    };
  };
};
