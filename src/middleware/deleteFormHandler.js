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
module.exports = (router) => {
  const prune = require('../util/delete')(router);

  return (req, res, next) => {
    if (req.method !== 'DELETE' || !req.formId) {
      return next();
    }

    prune.form(req.formId, req)
      .then(() => res.sendStatus(200))
      .catch((err) => {
        debug(err);
        return next(err);
      });
  };
};
