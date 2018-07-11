'use strict';

const _ = require('lodash');
const debug = require('debug')('formio:middleware:submissionResourceAccessFilter');

module.exports = function(router) {
  return function submissionResourceAccessFilter(req, res, next) {
    const util = router.formio.util;
    const hook = router.formio.hook;

    // Skip this filter, if request is from an administrator.
    if (req.isAdmin) {
      debug('Skipping, request is from an administrator.');
      return next();
    }

    // Skip this filter, if not flagged in the permission handler.
    if (!_.has(req, 'submissionResourceAccessFilter') || !req.submissionResourceAccessFilter) {
      return next();
    }

    // Should never get here without a form id present..
    if (!req.formId) {
      return res.sendStatus(500);
    }

    // Should never get here with a submission id present..
    if (req.subId) {
      return res.sendStatus(500);
    }

    // Cant determine submission resource access for not authenticated users.
    if (!req.user || !_.has(req, 'user._id') || !req.user._id) {
      return res.sendStatus(401);
    }

    const user = req.user._id;
    const search = [util.idToString(user), util.idToBson(user)];
    hook.alter('resourceAccessFilter', search, req, function(err, search) {
      // Try to recover if the hook fails.
      if (err) {
        debug(err);
      }

      const query = {
        form: util.idToBson(req.formId),
        deleted: {$eq: null},
        $or: [
          {
            'access.type': {$in: ['read', 'write', 'admin']},
            'access.resources': {$in: search}
          },
          {
            owner: req.token.user._id
          }
        ]
      };

      req.modelQuery = req.modelQuery || req.model || this.model;
      req.modelQuery = req.modelQuery.find(query);

      req.countQuery = req.countQuery || req.model || this.model;
      req.countQuery = req.countQuery.find(query);

      next();
    }.bind(this));
  };
};
