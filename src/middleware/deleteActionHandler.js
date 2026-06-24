'use strict';

const util = require('../util/util');
const debug = require('debug')('formio:middleware:deleteActionHandler');

/**
 * The deleteActionHandler middleware.
 *
 * This middleware is used for flagging Actions as deleted rather than actually deleting them.
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

    // Split the request url into its corresponding parameters.
    const params = util.getUrlParams(req.url);

    // Get the actionId from the request url.
    const actionId = params.hasOwnProperty('action')
      ? params.action
      : null;

    if (!actionId) {
      return next();
    }

    prune.action(actionId, null, req)
      .then(() => res.sendStatus(200))
      .catch((err) => {
        debug(err);
        return next(err);
      });
  };
};
