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
module.exports = function (router) {
  return function (action, getForm) {
    return async function (req, res, next) {
      if (
        !_.get(res, 'resource.item') ||
        req.skipProtectedFieldFilter ||
        router.formio.hook.alter('rawDataAccess', req, next, util.skipHookIfNotExists)
      ) {
        return next();
      }
      try {
        const formId = getForm(req);
        // we have the hydrated form (req.currentForm) from submissionHandler's loadCurrentForm()
        // even if a sub request removes the hydrated form from the parent request's formioCache
        // this led to leaked protected fields when a form had two nested forms:
        // one with save-as-reference: true and the other, save-as-reference: false
        // the save-as-reference form created a sub request that deleted the parent cache holding the hydrated
        // todo: possibly investigate the cache handling––
        // every time a sub request is created, the parent request's formioCache is deleted and perhaps leads to other weird bugs
        const form =
          req.currentForm && req.currentForm._id.toString() === formId.toString()
            ? req.currentForm
            : await router.formio.cache.loadForm(req, null, formId);
        util.removeProtectedFields(form, action, res.resource.item, req.doNotMinify || req.full);
        return next();
      } catch (err) {
        return next(err);
      }
    };
  };
};
