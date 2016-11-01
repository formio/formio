'use strict';

var _ = require('lodash');
var debug = require('debug')('formio:middleware:submissionResourceAccessFilter');

module.exports = function(router) {
  return function submissionResourceAccessFilter(req, res, next) {
    var util = router.formio.util;
    var hook = router.formio.hook;

    // Skip this filter, if not flagged in the permission handler.
    if (!_.has(req, 'submissionResourceAccessFilter') || !req.submissionResourceAccessFilter) {
      debug('Skipping, no req.submissionResourceAccessFilter.');
      return next();
    }

    // Should never get here without a form id present..
    if (!req.formId) {
      debug('No req.formId given.');
      return res.sendStatus(500);
    }

    // Should never get here with a submission id present..
    if (req.subId) {
      debug('req.subId given, skipping.');
      return res.sendStatus(500);
    }

    // Cant determine submission resource access for not authenticated users.
    if (!req.user || !_.has(req, 'user._id') || !req.user._id) {
      debug('No user given (' + req.user + ')');
      return res.sendStatus(401);
    }

    var user = req.user._id;
    var search = [util.idToString(user), util.idToBson(user)];
    hook.alter('resourceAccessFilter', search, req, function(err, search) {
      // Try to recover if the hook fails.
      if (err) {
        debug(err);
      }

      var query = {
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

      debug(query);
      req.modelQuery = req.modelQuery || this.model;
      req.modelQuery = req.modelQuery.find(query);

      req.countQuery = req.countQuery || this.model;
      req.countQuery = req.countQuery.find(query);

      next();
    }.bind(this));
  };
};
