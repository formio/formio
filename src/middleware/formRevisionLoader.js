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
    if (req.query.formRevision &&
      (res.resource.item.revisions === 'original' || req.query.formRevision.length === 24)) {
      hook.alter(
        'loadRevision',
        res.resource.item,
        req.query.formRevision,
        router.formio.mongoose.models.formrevision,
        (err, revision)=>{
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
