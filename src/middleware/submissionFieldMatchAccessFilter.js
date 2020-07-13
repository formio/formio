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
    const userRoles = _.get(req, 'user.roles', []);
    if (!userRoles.length) {
      return res.sendStatus(401);
    }
    // Perform our search.
    let query = null;
    // Map permissions to array of Mongo conditions
    const fieldsToCheck = Object.entries(req.submissionFieldMatchAccess).map(([, condition]) => {
      let allowed = true;
      if (condition.roles.length && !condition.roles.find((role) => userRoles.some((userRole) => userRole === role.toString()))) {
        allowed = false;
      }
      if (allowed) {
        if (condition.valueType === 'userFieldPath') {
          if (_.has(req, `user.${condition.valueOrPath}`)) {
            return {[`data.${condition.formFieldPath}`]:  {[condition.operator]: _.get(req, `user.${condition.valueOrPath}`)}};
          }
        }
        else if (condition.valueType === 'value') {
          return {[`data.${condition.formFieldPath}`]:  {[condition.operator]: condition.valueOrPath}};
        }
      }
    }).filter((condition) => !!condition);

    if (userId) {
      fieldsToCheck.push({owner: util.idToBson(userId)});
    }

    query = fieldsToCheck.length !== 0 ? {
      form: util.idToBson(req.formId),
      deleted: {$eq: null},
      $or: [...fieldsToCheck]
    } : {
      form: util.idToBson(req.formId),
      deleted: {$eq: null},
    };

    req.modelQuery = req.modelQuery || req.model || this.model;
    req.modelQuery = req.modelQuery.find(query);

    req.countQuery = req.countQuery || req.model || this.model;
    req.countQuery = req.countQuery.find(query);

    next();
  };
};
