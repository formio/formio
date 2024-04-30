'use strict';

const _ = require('lodash');
const {skipHookIfNotExists} = require('../util/util');

/**
 * Middleware function to filter the response from resourcejs.
 *
 * @param router
 * @param {array} settings
 *
 * @returns {Function}
 */
module.exports = (router) => (settings) => (req, res, next) => {
  if (
    !Array.isArray(settings) ||
    !_.get(res, 'resource.item') ||
    router.formio.hook.alter('rawDataAccess', req, next, skipHookIfNotExists)
  ) {
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

  res.resource.item = multi ? list : list[0];

  next();
};
