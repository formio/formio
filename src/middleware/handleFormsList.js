"use strict";

const { ObjectId } = require('../util/util');

require('dotenv').config();

/**
 * Middleware function to handle /form route.
 *
 * @param router
 *
 * @returns {Function}
 */

module.exports = function (router) {
  return async function (req, res, next) {
    // Only check access for GET requests to /form route
    if (req.path === "/form" && req.method === "GET") {
      const query = {};

      if(!req.user?.roles){
        return res.sendStatus(401);
      }
      // If specific formIds are provided, include them in query
      if (req.query.formIds) {
        query._id = { $in: req.query.formIds.split(",") };
        delete req.query.formIds;
      }
      if(!req.isAdmin){
        // Ensure role-based access check
        query.access = {
          $elemMatch: {
            'type': 'read_all',
            'roles': { $in: req.user.roles }
          }
        }
      }
      
      if(process.env.MULTI_TENANCY_ENABLED == "true" && !req.isAdmin){
        if(!req.token?.tenantKey){
          return res.sendStatus(401);
        }
        req.query.tenantKey = req.token.tenantKey
      }
      // Merge any additional query parameters
      req.query = { ...query, ...req.query };
    }
    next();
  };
};
