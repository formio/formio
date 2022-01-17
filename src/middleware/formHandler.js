'use strict';

/**
 * A handler for form based requests.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  const formio = hook.alter('formio', router.formio);

  return function formHandler(req, res, next) {
    if (['POST', 'PUT'].indexOf(req.method) !== -1 && req.body.path) {
      const fragments = req.body.path.split('/');
      if (
        formio.config.reservedForms.indexOf(req.body.path) !== -1 // Check the full path
        || formio.config.reservedForms.indexOf(fragments[0]) !== -1 // check the first path fragment if available
      ) {
        const message = 'Form path cannot contain one of the following names: ';
        return res.status(400).send(message + formio.config.reservedForms.join(', '));
      }
    }

    if ((req.method === 'POST' || req.method === 'PUT') && req.body.components) {
      /* eslint-disable no-useless-escape */
      const badCharacters = /^[^A-Za-z_]+|[^A-Za-z0-9\-\._]+/g;
      /* eslint-enable no-useless-escape */
      let error = false;
      formio.util.eachComponent(req.body.components, function(component) {
        // Remove all unsupported characters from api keys.
        if (component.hasOwnProperty('key')) {
          component.key = component.key.replace(badCharacters, '');
        }
        if (component.key === '' && !formio.util.isLayoutComponent(component)) {
          error = true;
        }
      }, true);

      if (error) {
        return res.status(400).send('All non-layout Form components must have a non-empty API Key.');
      }
    }

    hook.invoke('formRequest', req, res);
    if (req.method === 'GET') {
      const formQuery = hook.alter('formQuery', {}, req);
      req.countQuery = req.countQuery || req.model || this.model;
      req.modelQuery = req.modelQuery || req.model || this.model;
      req.countQuery = req.countQuery.find(formQuery);
      req.modelQuery = req.modelQuery.find(formQuery);
    }
    next();
  };
};
