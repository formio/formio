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
module.exports = (router) => {
  const prune = require('../util/delete')(router);

  return (req, res, next) => {
    if (req.method !== 'DELETE' || !req.subId) {
      return next();
    }

    prune.submission(req.subId, null, req)
      .then((submission = []) => {
        // Skip the resource...
        req.skipResource = true;
        res.resource = {
          status: 200,
          item: {},
          previousItem: submission[0],
          deleted: true
        };
        next();
      })
      .catch((err) => {
        debug(err);
        return next(err);
      });
  };
};
