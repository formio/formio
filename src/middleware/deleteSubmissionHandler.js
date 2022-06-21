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
    if (req.method !== 'DELETE') {
      return next();
    }

    if (req.subId) {
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
    }
    else if (req.formId) {
      if (req.headers['x-delete-confirm'] !== req.formId) {
        res.resource = {
          status: 400,
          item: {error: 'No confirmation header provided'},
          deleted: false
        };
        return next();
      }

      prune.submission(null, req.formId, req)
        .then(() => {
          res.resource = {
            status: 200,
            item: {},
            deleted: true
          };
          next();
        })
        .catch((err) => {
          debug(err);
          return next(err);
        });
    }
  };
};
