'use strict';

const _ = require('lodash');
const debug = require('debug')('formio:middleware:submissionResourceAccessFilter');

module.exports = function(router) {
  return function submissionResourceAccessFilter(req, res, next) {
    const util = router.formio.util;

    // Skip this filter, if request is from an administrator.
    if (req.isAdmin) {
      debug('Skipping, request is from an administrator.');
      return next();
    }

    // Skip this filter, if not flagged in the permission handler.
    if (!_.has(req, 'submissionFieldMatchAccess') || !req.submissionFieldMatchAccess) {
      return next();
    }

    // Should never get here WITHOUT a form id present or WITH a submission id present.
    if (!req.formId || req.subId) {
      return res.sendStatus(400);
    }

    const userId = _.get(req, 'user._id');
    // Perform our search.
    let query = null;
    const fieldsToCheck = Object.entries(req.submissionFieldMatchAccess).map(([, fields]) => {
      if (_.has(req, `user.${fields.userFieldPath}`)) {
        return {[`data.${fields.formFieldPath}`]:  {$eq: _.get(req, `user.${fields.userFieldPath}`)}};
      }
    });
    if (userId) {
      query = {
        form: util.idToBson(req.formId),
        deleted: {$eq: null},
        $or: [
          ...fieldsToCheck,
          {
            owner: util.idToBson(userId)
          }
        ]
      };
    }
    else {
      query = {
        form: util.idToBson(req.formId),
        deleted: {$eq: null},
        $or: {
          ...fieldsToCheck
        }
      };
    }

    req.modelQuery = req.modelQuery || req.model || this.model;
    req.modelQuery = req.modelQuery.find(query);

    req.countQuery = req.countQuery || req.model || this.model;
    req.countQuery = req.countQuery.find(query);

    next();
  };
};
