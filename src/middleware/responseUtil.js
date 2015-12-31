'use strict';

/**
 * Add jsonPretty() to requests, for returning human readible json
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  // Add jsonPretty to res object
  router.use(function(req, res, next) {
    res.jsonPretty = function(obj) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(obj, null, 2)); // For humans
    };
    next();
  });
};
