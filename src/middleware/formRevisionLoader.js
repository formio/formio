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
    if (req.query.formRevision &&
      (res.resource.item.revisions === 'original' || req.query.formRevision.length === 24)) {
        try {
          const revision = await hook.alter(
           'loadRevision',
            res.resource.item,
            req.query.formRevision,
            router.formio.mongoose.models.formrevision);

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
