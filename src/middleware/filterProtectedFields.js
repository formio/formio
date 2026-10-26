'use strict';

const util = require('../util/util');
const _ = require('lodash');

/**
 * Middleware function to filter protected fields from a submission response.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
  return function(action, getForm) {
    return function(req, res, next) {
      if (
        !_.get(res, 'resource.item') ||
        req.skipProtectedFieldFilter ||
        router.formio.hook.alter('rawDataAccess', req, next, util.skipHookIfNotExists)
      ) {
        return next();
      }

      const formId = getForm(req);
      const removeProtectedFields = (form) => {
        util.removeProtectedFields(form, action, res.resource.item, req.doNotMinify || req.query.full);
        next();
      };

      // we have the hydrated form (req.currentForm) from submissionHandler's loadCurrentForm()
      // even if a sub request removes the hydrated form from the parent request's formioCache
      // this led to leaked protected fields when a form had two nested forms:
      // one with save-as-reference: true and the other, save-as-reference: false
      // the save-as-reference form created a sub request that deleted the parent cache holding the hydrated
      if (req.currentForm && req.currentForm._id.toString() === formId.toString()) {
        return removeProtectedFields(req.currentForm);
      }

      router.formio.cache.loadForm(req, null, formId, function(err, form) {
        if (err) {
          return next(err);
        }

        removeProtectedFields(form);
      });
    };
  };
};
