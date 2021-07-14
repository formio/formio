'use strict';
const url = require('url');
const debug = require('debug')('formio:alias');

/**
 * Provides URL alias capabilities.
 *
 * Middleware to resolve a form alias into its components.
 */
module.exports = function(router) {
  // Setup the reserved forms regex.
  if (!router.formio.config.reservedForms || !router.formio.config.reservedForms.length) {
    /* eslint-disable max-len */
    router.formio.config.reservedForms = [
      'submission',
      'exists',
      'export',
      'role',
      'current',
      'logout',
      'form',
      'access',
      'token',
      'recaptcha',
      'action',
      'actionItem',
      'tag'
    ];
    /* eslint-enable max-len */
  }

  /* eslint-disable no-useless-escape */
  const formsRegEx = new RegExp(`\/(${router.formio.config.reservedForms.join('|')})($|\/.*)`, 'i');
  /* eslint-enable no-useless-escape */

  // Handle the request.
  return function aliasHandler(req, res, next) {
    // Allow a base url to be provided to the alias handler.
    const baseUrl = aliasHandler.baseUrl ? aliasHandler.baseUrl(req) : '';

    // Get the alias from the request.
    let alias = url.parse(req.url).pathname.substr(baseUrl.length).replace(formsRegEx, '').substr(1);
    alias = router.formio.hook.alter('alias', alias, req, res);

    // If this is normal request, then pass this middleware.
    /* eslint-disable no-useless-escape */
    if (!alias || alias.match(/^(form$|form[\?\/])/) || alias === 'spec.json' || alias ===  'config.json') {
      return next();
    }
    /* eslint-enable no-useless-escape */

    // Now load the form by alias.
    router.formio.cache.loadFormByAlias(req, alias, function(error, form) {
      if (error) {
        debug(`Error: ${error}`);
        return res.status(400).send('Invalid alias');
      }
      if (!form) {
        return res.status(404).send('Form not found.');
      }

      // Set the form ID in the request.
      req.formId = form._id.toString();

      // Get the additional path.
      let additional = req.url.substr(baseUrl.length + alias.length + 1);

      // Handle a special case where they 'POST' to the form. Assume to create a submission.
      if (!additional && req.method === 'POST') {
        additional = '/submission';
      }

      // Create the new URL for the project.
      req.url = `${baseUrl}/form/${form._id}${additional}`;
      next();
    });
  };
};
