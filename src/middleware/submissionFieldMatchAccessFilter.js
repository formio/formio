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
    if (!_.has(req, 'submissionFieldMatchAccessFilter') || req.submissionFieldMatchAccessFilter === false) {
      return next();
    }

    // Should never get here WITHOUT a form id present or WITH a submission id present.
    if (!req.formId || req.subId) {
      return res.sendStatus(400);
    }

    const userId = _.get(req, 'user._id');
    const userRoles = _.get(req, 'accessRoles', []);
    if (!userRoles.length) {
      return res.sendStatus(401);
    }
    // Perform our search.
    let query = null;
    const hasRolesIntersection = (condition) => !!_.intersectionWith(condition.roles, userRoles,
      (role, userRole) => role.toString() === userRole.toString()).length;

    // Map permissions to array of Mongo conditions
    const fieldsToCheck = Object.entries(req.submissionFieldMatchAccess).flatMap(([, conditions]) => {
      return Array.isArray(conditions) ? conditions.map((condition) => {
        if (hasRolesIntersection(condition)) {
          const {formFieldPath, operator, value, valueType} = condition;

          if (value) {
            return {[formFieldPath]:  {[operator]: util.castValue(valueType, value)}};
          }
        }
      }) : [];
    }).filter((condition) => !!condition);

    if (userId) {
      fieldsToCheck.push({owner: util.idToBson(userId)});
    }

    query = fieldsToCheck.length !== 0 ? {
      form: util.idToBson(req.formId),
      deleted: {$eq: null},
      $or: [...fieldsToCheck]
    } : null;

    // If there no conditions which may give an access to the current user, return the Unauthorized response
    if (!query) {
      return res.sendStatus(401);
    }

    if (req.modelQuery) {
      const orCondition = _.get(req.modelQuery, '_conditions["$or"]', []);
      query['$or'].push(...orCondition);
    }

    req.modelQuery = req.modelQuery || req.model || this.model;
    req.modelQuery = req.modelQuery.find(query);

    req.countQuery = req.countQuery || req.model || this.model;
    req.countQuery = req.countQuery.find(query);

    next();
  };
};
