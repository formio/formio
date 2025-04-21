'use strict';

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
        req.log.error({module: 'formio:middleware:deleteFormHandler', err});
        return next(err);
      });
  };
};
