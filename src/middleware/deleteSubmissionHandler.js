'use strict';

const debug = require('debug')('formio:middleware:deleteSubmissionHandler');

/**
 * The deleteSubmissionHandler middleware.
 *
 * This middleware is used for flagging submissions as deleted rather than actually deleting them.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  const prune = require('../util/delete')(router);
  return function(req, res, next) {
    debug(!(req.method !== 'DELETE' || !req.subId));
    if (req.method !== 'DELETE' || !req.subId) {
      return next();
    }

    prune.submission(req.subId, null, req, function(err, submission) {
      if (err) {
        debug(err);
        return next(err);
      }

      // Skip the resource...
      req.skipResource = true;
      res.resource = {
        status: 200,
        item: {},
        deleted: true
      };
      next();
    });
  };
};
