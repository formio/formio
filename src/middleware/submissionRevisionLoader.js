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

  return (req, res, next) => {
    if (req.query.submissionRevision) {
      const model = req.submissionRevisionModel ? req.submissionRevisionModel
      : router.formio.mongoose.models.submissionrevision;
        hook.alter('loadRevision', res.resource.item, req.query.submissionRevision, model, (err, revision)=>{
            if ( err ) {
              return next(err);
            }
            res.resource.item = revision;
            if ( revision===null ) {
              res.resource.status = 404;
            }
            return next();
          });
        }
        else {
            return next();
        }
  };
 };
