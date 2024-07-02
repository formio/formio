'use strict';

/**
 * Middleware to load a form revision if needed.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */

 module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);

  return async (req, res, next) => {
    if (req.query.submissionRevision) {
      const model = req.submissionRevisionModel ? req.submissionRevisionModel
      : router.formio.mongoose.models.submissionrevision;

      try {
        const revision = await hook.alter('loadRevision', res.resource.item, req.query.submissionRevision, model);
        res.resource.item = revision;
        if ( revision===null ) {
          res.resource.status = 404;
        }
        return next();
      }
      catch (err) {
        return next(err);
      }
    }
    else {
      return next();
    }
  };
 };
