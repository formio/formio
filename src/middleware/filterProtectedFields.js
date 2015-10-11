'use strict';

var _ = require('lodash');
var deleteProp = require('delete-property');
var debug = require('debug')('formio:middleware:filterProtectedFields');
var util = require('../util/util');


/**
 * Middleware function to filter protected fields from a submission response.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
    return function (req, res, next) {
      if (!res || !res.resource || !res.resource.item) {
        return next();
      }

      router.formio.cache.loadCurrentForm(req, function(err, currentForm) {
        if(err) {
          return next(err);
        }

        _.each(util.flattenComponents(currentForm.components), function(component) {
          if(component.protected) {
            debug('Removing protected field:', component.key);
            var deleteProtected = deleteProp('data.' + util.getSubmissionKey(component.key));

            if(_.isArray(res.resource.item)) {
              _.each(res.resource.item, deleteProtected);
            }
            else {
              deleteProtected(res.resource.item);
            }
          }

        });

        next();
      });

    };
};
