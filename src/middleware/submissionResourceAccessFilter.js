'use strict';

const _ = require('lodash');
const debug = require('debug')('formio:middleware:submissionResourceAccessFilter');
const EVERYONE = '000000000000000000000000';

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
      return res.sendStatus(400);
    }

    // Should never get here with a submission id present..
    if (req.subId) {
      return res.sendStatus(400);
    }

    // Cant determine submission resource access if no roles are provided.
    const userRoles = _.get(req, 'user.roles', []);
    if (!userRoles.length) {
      return res.sendStatus(401);
    }

    const userId = _.get(req, 'user._id');
    const search = userRoles.map(util.idToBson.bind(util));
    search.push(util.idToBson(EVERYONE));
    if (userId) {
      search.push(util.idToBson(userId));
    }
    hook.alter('resourceAccessFilter', search, req, function(err, newSearch) {
      // Try to recover if the hook fails.
      if (err) {
        debug(err);
      }

      // If not search is provided, then just default to the user or everyone if there is no user.
      if (!newSearch || !newSearch.length) {
        newSearch = [];
        newSearch.push(util.idToBson(EVERYONE));
        if (userId) {
          newSearch.push(util.idToBson(userId));
        }
      }

      // Perform our search.
      let query = null;
      if (userId) {
        query = {
          form: util.idToBson(req.formId),
          deleted: {$eq: null},
          $or: [
            {
              access: {
                $elemMatch: {
                  type: {$in: ['read', 'write', 'admin']},
                  resources: {$in: newSearch},
                },
              },
            },
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
          access: {
            $elemMatch: {
              type: {$in: ['read', 'write', 'admin']},
              resources: {$in: newSearch},
            },
          },
        };
      }

      req.modelQuery = req.modelQuery || req.model || this.model;
      req.modelQuery = req.modelQuery.find(query);

      req.countQuery = req.countQuery || req.model || this.model;
      req.countQuery = req.countQuery.find(query);

      next();
    }.bind(this));
  };
};
