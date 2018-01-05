'use strict';

const debug = require('debug')('formio:middleware:deleteFormHandler');

/**
 * The deleteFormHandler middleware.
 *
 * This middleware is used for flagging Forms as deleted rather than actually deleting them.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  const prune = require('../util/delete')(router);
  return function(req, res, next) {
    if (req.method !== 'DELETE' || !req.formId) {
      debug('Skipping');
      return next();
    }

    prune.form(req.formId, req, function(err) {
      if (err) {
        debug(err);
        return next(err);
      }

      return res.sendStatus(200);
    });
  };
};
