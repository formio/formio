'use strict';
const jsonPatch = require('fast-json-patch');

module.exports = router => (req, res, next) => {
  if (req.method !== 'PATCH') {
    return next();
  }

  router.formio.cache.loadSubmission(req, req.formId, req.subId, function(err, submission) {
    if (err) {
      return res.sendStatus(400);
    }

    // No submission exists.
    if (!submission) {
      return res.sendStatus(404);
    }

    const patch = req.body;

    try {
      req.body = jsonPatch.applyPatch(submission, patch, true).newDocument;

      return next();
    }
    catch (err) {
      res.status(400).send(err);
    }
  });
};
