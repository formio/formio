'use strict';
const _ = require('lodash');

/**
 * Middleware to load a full form if needed.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  return function formLoader(req, res, next) {
    let shouldLoadSubForms = true;
    // Only process on GET request, and if they provide full query.
    if (
      req.method !== 'GET' ||
      !req.query.full ||
      !res.resource ||
      !res.resource.item
    ) {
      shouldLoadSubForms = false;
    }

    //populate reCAPTCHA siteKey from Project Settings if reCAPTCHA is enabled for this form
    if (_.get(res.resource.item, 'settings.recaptcha.isEnabled')) {
      hook.settings(req, (err, settings) => {
        _.set(res.resource.item, 'settings.recaptcha.siteKey', _.get(settings, 'recaptcha.siteKey'));
        // Load all subforms recursively.
        if (shouldLoadSubForms) {
          router.formio.cache.loadSubForms(res.resource.item, req, next);
        }
        else {
          return next();
        }
      });
    }
    else {
      // Load all subforms recursively.
      if (shouldLoadSubForms) {
        router.formio.cache.loadSubForms(res.resource.item, req, next);
      }
      else {
        return next();
      }
    }
  };
};
