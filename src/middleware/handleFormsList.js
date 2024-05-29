"use strict";

/**
 * Middleware function to handle /form route.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function (router) {
  return function (req, res, next) { 
    // If the request is for the /form route, and it is a GET request, then we need to check
    if(req.path === "/form" && req.method === "GET"){
      if(!req.isAdmin) return res.sendStatus(401)
      if(req.query.formIds){
        req.query._id = { $in: req.query.formIds.split(",")}
        delete req.query.formIds
      }
      if(process.env.MULTI_TENANCY_ENABLED == "true"){
        if(!req.token?.tenantKey && !req.isAdmin){
          return res.json([])
        }
        if(!req.isAdmin){
          req.query.tenantKey = req.token.tenantKey
        }
      }
    }
    next()
  };
};


