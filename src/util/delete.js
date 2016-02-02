'use strict';

var _ = require('lodash');
var async = require('async');

/**
 *
 * @param router
 * @returns {{submission: Function, form: Function}}
 */
module.exports = function(router) {
  var hook = require('./hook')(router.formio);

  /**
   * Flag a submission as deleted. If given a subId, one submission will be flagged; if given a formId, then all the
   * submissions for that formId will be flagged.
   *
   * @param {String|ObjectId} subId
   *   The submission id to flag as deleted.
   * @param {Array} forms
   *   A list of form ids to flag all submissions as deleted.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteSubmission = function(subId, forms, next) {
    var _debug = require('debug')('formio:delete:submission');
    if (!subId && !forms) {
      _debug('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    // Build the query, using either the subId or forms array.
    var query = {deleted: {$eq: null}};
    if (subId) {
      query._id = subId;
    }
    else {
      query.form = {$in: forms};
    }

    _debug('Deleting ' + (subId ? 'single submission' : 'multiple submissions'));
    _debug(query);
    router.formio.resources.submission.model.find(query, function(err, submissions) {
      if (err) {
        _debug(err);
        return next(err);
      }
      if (!submissions || submissions.length === 0) {
        _debug('No submissions found.');
        return next();
      }

      submissions.forEach(function(submission) {
        submission.deleted = Date.now();
        submission.markModified('deleted');
        submission.save(function(err, submission) {
          if (err) {
            _debug(err);
            return next(err);
          }

          _debug(submission);
        });
      });

      next();
    });
  };

  /**
   * Flag an Action as deleted. If given a actionId, one action will be flagged; if given a formId, or array of formIds,
   * then all the Actions for that form, or forms, will be flagged.
   *
   * @param {String|ObjectId} actionId
   *   The Action id to flag as deleted.
   * @param {String|ObjectId|Array} forms
   *   A list of form ids to flag all Actions as deleted.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteAction = function(actionId, forms, next) {
    var _debug = require('debug')('formio:delete:action');
    if (!actionId && !forms) {
      _debug('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    var query = {deleted: {$eq: null}};
    if (actionId) {
      query._id = actionId;
    }
    else {
      query.form = {$in: forms};
    }


    _debug('Deleting ' + (actionId ? 'single action' : 'multiple actions'));
    _debug(query);
    router.formio.actions.model.find(query, function(err, actions) {
      if (err) {
        _debug(err);
        return next(err);
      }
      if (!actions || actions.length === 0) {
        _debug('No actions found.');
        return next();
      }

      actions.forEach(function(action) {
        action.settings = action.settings || {};
        action.deleted = Date.now();
        action.markModified('deleted');
        action.save(function(err, action) {
          if (err) {
            _debug(err);
            return next(err);
          }

          _debug(action);
        });
      });

      // Continue once all the forms have been updated.
      next();
    });
  };

  /**
   * Flag a form as deleted. If given a formId, one form will be flagged;
   *
   * @param {String|ObjectId} formId
   *   The form id to flag as deleted.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteForm = function(formId, next) {
    var _debug = require('debug')('formio:delete:form');
    if (!formId) {
      _debug('Skipping');
      return next();
    }

    var query = {_id: formId, deleted: {$eq: null}};
    _debug(query);
    router.formio.resources.form.model.findOne(query, function(err, form) {
      if (err) {
        _debug(err);
        return next(err);
      }
      if (!form) {
        _debug('No form found with the _id: ' + formId);
        return next();
      }

      form.deleted = Date.now();
      form.markModified('deleted');
      form.save(function(err, form) {
        if (err) {
          _debug(err);
          return next(err);
        }

        deleteAction(null, formId, function(err) {
          if (err) {
            _debug(err);
            return next(err);
          }

          deleteSubmission(null, formId, function(err) {
            if (err) {
              _debug(err);
              return next(err);
            }

            _debug(form);
            next();
          });
        });
      });
    });
  };

  /**
   * Delete all known references to access for the given role.
   *
   * @param {String|ObjectId} roleId
   *   The roleId to delete access for.
   * @param {Object} req
   *   The express callback function.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteRoleAccess = function(roleId, req, next) {
    var util = router.formio.util;
    var _debug = require('debug')('formio:delete:roleaccess');
    if (!roleId) {
      _debug('Skipping');
      return next();
    }

    // Convert the roldId to a string for comparison.
    roleId = util.idToString(roleId);

    // The access types to check.
    var accessType = ['access', 'submissionAccess'];

    // The formIds to check.
    var formIds = null;

    /**
     * Remove the roleId from the forms' access types.
     *
     * @param {Function} cb
     *   The callback function to invoke after the role has been removed.
     */
    var removeFromForm = function(cb) {
      // Build the or query on accessTypes.
      var or = [];
      accessType.forEach(function(access) {
        var temp = {};
        var key = access + '.roles';
        temp[key] = roleId;
        or.push(temp);
      });

      var query = hook.alter('formQuery', {_id: {$in: formIds}, $or: or}, req);
      _debug(query);
      router.formio.resources.form.model.find(query)
        .snapshot(true)
        .exec(function(err, forms) {
          if (err) {
            _debug(err);
            return cb(err);
          }
          if (!forms || forms.length === 0) {
            _debug('No forms found with the query: ' + JSON.stringify(query));
            return cb();
          }

          // Iterate each form and remove the role.
          _debug('Found ' + forms.length + ' forms to modify.');
          async.eachSeries(forms, function(form, done) {
            // Iterate each access type to remove the role.
            accessType.forEach(function(access) {
              var temp = form.toObject()[access] || [];

              // Iterate the roles for each permission type, and remove the given roleId.
              for (var b = 0; b < temp.length; b++) {
                // Convert the ObjectIds to strings for comparison.
                temp[b].roles = _.map((temp[b].roles || []), util.idToString);

                // Remove the given roleId if it was defined in the access.
                if (temp[b].roles.indexOf(roleId) !== -1) {
                  _.pull(temp[b].roles, roleId);
                }
              }

              form.set(access, temp);
            });

            form.save(function(err, form) {
              if (err) {
                _debug(err);
                return done(err);
              }

              _debug(JSON.stringify(form));
              done();
            });
          }, function(err) {
            if (err) {
              _debug(err);
              return cb(err);
            }

            cb();
          });
        });
    };

    /**
     * Remove the roleId from the submissions for the given formIds.
     *
     * @param {Function} cb
     *   The callback function to invoke after the roles have been removed.
     */
    var removeFromSubmissions = function(cb) {
      var util = router.formio.util;
      // Find all submissions that contain the role in its roles.
      var query = {form: {$in: formIds}, deleted: {$eq: null}, roles: roleId};
      _debug(query);
      router.formio.resources.submission.model.find(query)
        .snapshot(true)
        .exec(function(err, submissions) {
          if (err) {
            _debug(err);
            return cb(err);
          }
          if (!submissions || submissions.length === 0) {
            _debug('No submissions found with given query: ' + JSON.stringify(query));
            return cb();
          }

          // Iterate each submission to filter the roles.
          async.eachSeries(submissions, function(submission, done) {
            var temp = _.map((submission.toObject().roles || []), util.idToString);

            // Omit the given role from all submissions.
            if (temp.indexOf(roleId) !== -1) {
              _.pull(temp, roleId);
            }

            submission.set('roles', temp);
            submission.save(function(err, submission) {
              if (err) {
                _debug(err);
                return done(err);
              }

              _debug(submission);
              done();
            });
          }, function(err) {
            if (err) {
              _debug(err);
              return cb(err);
            }

            cb();
          });
        });
    };

    router.formio.resources.form.model.find(hook.alter('formQuery', {deleted: {$eq: null}}, req))
      .snapshot(true)
      .exec(function(err, forms) {
        if (err) {
          _debug(err);
          return next(err);
        }
        if (!forms) {
          _debug('No forms given.');
          return next();
        }

        // update the list of formIds
        formIds = _.map(forms, function(form) {
          return form.toObject()._id.toString();
        });
        _debug('Forms: ' + JSON.stringify(formIds));

        async.series([
          removeFromForm,
          removeFromSubmissions
        ], function(err) {
          if (err) {
            _debug(err);
            return next(err);
          }

          next();
        });
      });
  };

  /**
   * Flag a Role as deleted. If given a roleId, one Role will be flagged;
   *
   * @param {String|ObjectId} roleId
   *   The Role id to flag as deleted.
   * @param {Object} req
   *   The express request object.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteRole = function(roleId, req, next) {
    var util = router.formio.util;
    var _debug = require('debug')('formio:delete:role');
    if (!roleId) {
      _debug('Skipping');
      return next();
    }

    var query = {_id: util.idToBson(roleId), deleted: {$eq: null}};
    _debug(query);
    router.formio.resources.role.model.findOne(query, function(err, role) {
      if (err) {
        _debug(err);
        return next(err);
      }
      if (!role) {
        _debug('No role found with _id: ' + roleId);
        return next();
      }

      role.deleted = Date.now();
      role.markModified('deleted');
      role.save(function(err, role) {
        if (err) {
          _debug(err);
          return next(err);
        }

        deleteRoleAccess(roleId, req, function(err) {
          if (err) {
            _debug(err);
            return next(err);
          }

          _debug(role);
          next();
        });
      });
    });
  };

  /**
   * Expose the internal functionality for hiding 'deleted' entities.
   */
  return {
    submission: deleteSubmission,
    form: deleteForm,
    action: deleteAction,
    role: deleteRole
  };
};
