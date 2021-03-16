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
module.exports = (router) => (settings, callback) => (req, res, next) => {
  if (!Array.isArray(settings) || !res || !res.resource || !res.resource.item) {
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

  /* eslint-disable callback-return */
  if (callback) {
    callback(req, res);
  }

  next();
};
