'use strict';

module.exports = (router) => (req, res, next) => {
  if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  router.formio.cache.loadSubmission(
    req,
    req.body.form || req.params.formId,
    req.body._id || req.params.submissionId,
    (err, previousSubmission) => {
      if (err) {
        return next(err);
      }

      req.previousSubmission = previousSubmission;
      return next();
    },
  );
};
