'use strict';

var util = require('../util/util');
var debug = require('debug')('formio:middleware:deleteActionHandler');

/**
 * The deleteActionHandler middleware.
 *
 * This middleware is used for flagging Actions as deleted rather than actually deleting them.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  var prune = require('../util/delete')(router);
  return function(req, res, next) {
    if (req.method !== 'DELETE') {
      debug('Skipping');
      return next();
    }

    // Split the request url into its corresponding parameters.
    var params = util.getUrlParams(req.url);

    // Get the actionId from the request url.
    var actionId = params.hasOwnProperty('action')
      ? params.action
      : null;

    if (!actionId) {
      return next();
    }

    prune.action(actionId, null, function(err) {
      if (err) {
        debug(err);
        return next(err);
      }

      return res.sendStatus(200);
    });
  };
};
