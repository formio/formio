'use strict';
const jsonPatch = require('fast-json-patch');
const _ = require('lodash');

// Operations to block when protected fields are targeted (when 'from' or 'path' points to a protected field)
const READ_OPERATION_POINTERS = {copy: 'from', move: 'from', test: 'path'};

const valueAtPointer = (submission, pointer) => {
  try {
    return jsonPatch.getValueByPointer(submission, pointer);
  }
  catch (ignoreErr) {
    return undefined;
  }
};

module.exports = router => (req, res, next) => {
  if (req.method !== 'PATCH') {
    return next();
  }

  const childReq = router.formio.util.createSubRequest(req);

  if (!childReq) {
    return res.headersSent ? next() : res.status(400).json('Too many recursive requests.');
  }

  childReq.permissionsChecked = true;

  childReq.method = 'GET';
  // Patch the RAW submission, not the redacted GET response. Otherwise protected
  // fields are stripped from the base and any the patch does not touch get wiped
  // from storage on save.
  childReq.skipProtectedFieldFilter = true;

  const childRes = router.formio.util.createSubResponse((err) => {
    if (childRes.statusCode > 299) {
      return res.headersSent ? next() : res.status(childRes.statusCode).json(err);
    }
  });

  router.resourcejs[req.route.path]['get'](childReq, childRes, function(err) {
    if (err) {
      return res.status(400).send(err);
    }

    const submission = _.get(childRes, 'resource.item', false);
    // No submission exists.
    if (!submission) {
      return res.sendStatus(404);
    }

    let patch = req.body;

    if (!_.isArray(patch) && req.subPatch && !_.isEmpty(req.body)) {
      patch = jsonPatch.compare(submission.data, req.body.data)
        .map((operation) => {
          operation.path = `/data${operation.path}`;
          return operation;
        });
    }

    // A read operation may only reference a component that survives redaction.
    const reads = _.isArray(patch) ? patch.filter(({op}) => READ_OPERATION_POINTERS[op]) : [];

    if (reads.length) {
      // not redacted until the mutating `removeProtectedFields` removes protected fields
      const redacted = _.cloneDeep(submission);
      router.formio.util.removeProtectedFields(childReq.currentForm, 'update', redacted, true);

      const readsProtected = reads.some((operation) => {
        // the `pointer` is the path of the targeted field (i.e. /data/ssn, the 'from' value in comment below)
        // i.e. { 'op': 'copy', 'from': '/data/ssn', ... }
        const pointer = operation[READ_OPERATION_POINTERS[operation.op]];
        const rawValue = valueAtPointer(submission, pointer);
        const redactedValue = valueAtPointer(redacted, pointer);
        return !_.isEqual(rawValue, redactedValue);
      });

      if (readsProtected) {
        return res
          .status(400)
          .json('PATCH: copy, move and test operations cannot target protected fields.');
      }
    }

    try {
      req.body = jsonPatch.applyPatch(submission, patch, true).newDocument;

      return next();
    }
    catch (err) {
      // fast-json-patch attaches the document it was patching as err.tree, which is now the RAW
      // submission rather than the redacted GET response, so redact it
      if (_.get(err, 'tree.data')) {
        router.formio.util.removeProtectedFields(childReq.currentForm, 'update', err.tree, true);
      }
      res.status(400).send(err);
    }
  });
};
