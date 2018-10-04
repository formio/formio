'use strict';
const uuidv1 = require('uuid/v1');

module.exports = function(router) {
  return function requestLogger(req, res, next) {
    req.uuid = uuidv1();
    router.formio.log(`Request ${req.uuid}:`, req, req.method, req.path);
    next();
  };
};
