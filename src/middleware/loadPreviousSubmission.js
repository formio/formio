'use strict';

module.exports = (router) => async (req, res, next) => {
  if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  try {
    const previousSubmission = await router.formio.cache.loadSubmission(
      req,
      req.body.form,
      req.body._id);

    req.previousSubmission = previousSubmission;
    return next();
  }
  catch (err) {
    return next(err);
  }
};
