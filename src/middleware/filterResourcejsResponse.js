'use strict';

const _ = require('lodash');
const debug = require('debug')('formio:middleware:filterResourcejsResponse');

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
      if (!settings || settings === [] || !(settings instanceof Array)) {
        return next();
      }
      if (!res || !res.resource || !res.resource.item) {
        return next();
      }

      debug(settings);
      // Merge all results into an array, to handle the cases with multiple results.
      let multi = false;
      const list = [].concat(res.resource.item);
      if (res.resource.item instanceof Array) {
        multi = true;
      }

      // Iterate each provided filter.
      for (let a = 0; a < settings.length; a++) {
        // Iterate each result.
        for (let b = 0; b < list.length; b++) {
          // Change the response object from a mongoose model to a js object.
          if (list[b].constructor.name === 'model') {
            list[b] = list[b].toObject();
          }
          // Remove the key if found.
          if (list[b].hasOwnProperty(settings[a])) {
            debug(`Removing: ${settings[a]}`);
            list[b] = _.omit(list[b], settings[a]);
          }
        }
      }

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
