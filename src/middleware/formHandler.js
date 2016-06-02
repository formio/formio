'use strict';

/**
 * A handler for form based requests.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  return function formHandler(req, res, next) {
    if (req.method === 'POST' && req.body.path) {
      var pathParts = req.body.path.split('/');
      if (router.formio.config.reservedForms.indexOf(pathParts[0]) !== -1) {
        var message = 'Form path cannot contain one of the following names: ';
        return res.status(400).send(message + router.formio.config.reservedForms.join(', '));
      }
    }

    hook.invoke('formRequest', req, res);
    if (req.method === 'GET') {
      req.countQuery = req.countQuery || this.model;
      req.modelQuery = req.modelQuery || this.model;
      req.countQuery = req.countQuery.find(hook.alter('formQuery', {}, req));
      req.modelQuery = req.modelQuery.find(hook.alter('formQuery', {}, req));
    }
    next();
  };
};
