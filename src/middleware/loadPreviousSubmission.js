'use strict';

module.exports = (router) => (req, res, next) => {
  // Only run for put/patch requests.
  if (!['PUT', 'POST'].includes(req.method)) {
    return next();
  }

  router.formio.cache.loadSubmission(
    req,
    req.body.form,
    req.body._id,
    (err, previousSubmission) => {
      if (err) {
        return next(err);
      }

      req.previousSubmission = previousSubmission;
      return next();
    });
};
