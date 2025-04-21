'use strict';

const _ = require('lodash');
const EVERYONE = '000000000000000000000000';

module.exports = function(router) {
  return async function submissionResourceAccessFilter(req, res, next) {
    const httpLogger = req.log.child({module: 'formio:middleware:submissionResourceAccessFilter'});
    const util = router.formio.util;
    const hook = router.formio.hook;

    const getSearch = (userId, userRoles) => {
      const search = userRoles.map(util.idToBson.bind(util));
      search.push(util.idToBson(EVERYONE));
      if (userId) {
        search.push(util.idToBson(userId));
      }
      return search;
    };

    const getQuery = (req, newSearch, userId) => {
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
            return query;
    };

    const getNewSearch = async (req, search, userId) => {
      let newSearch = await hook.alter('resourceAccessFilter', search, req);
      // If not search is provided, then just default to the user or everyone if there is no user.
      if (!newSearch || !newSearch.length) {
        newSearch = [];
        newSearch.push(util.idToBson(EVERYONE));
        if (userId) {
          newSearch.push(util.idToBson(userId));
        }
      }
      return newSearch;
    };

    // Skip this filter, if request is from an administrator.
    if (req.isAdmin) {
      httpLogger.info('Skipping, request is from an administrator.');
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

    const search = getSearch(userId, userRoles);
    try {
      const newSearch = await getNewSearch(req, search, userId);

      // Perform our search.
      const query = getQuery(req, newSearch, userId);

      req.modelQuery = req.modelQuery || req.model || this.model;
      req.modelQuery = req.modelQuery.find(query);

      req.countQuery = req.countQuery || req.model || this.model;
      req.countQuery = req.countQuery.find(query);

      return next();
  }
  catch (err) {
      // Try to recover if the hook fails.
      httpLogger.error(err);
    }
  };
};

