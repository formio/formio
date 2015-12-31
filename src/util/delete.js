'use strict';

var _ = require('lodash');
var async = require('async');
var debug = {
  submission: require('debug')('formio:util:delete#submission'),
  form: require('debug')('formio:util:delete#form'),
  action: require('debug')('formio:util:delete#action'),
  role: require('debug')('formio:util:delete#role'),
  roleAccess: require('debug')('formio:util:delete#roleAccess')
};

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
   * @param subId {string|ObjectId}
   *   The submission id to flag as deleted.
   * @param forms {array}
   *   A list of form ids to flag all submissions as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteSubmission = function(subId, forms, next) {
    if (!subId && !forms) {
      debug.submission('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    if (subId) {
      router.formio.resources.submission.model.findOne({_id: subId, deleted: {$eq: null}}, function(err, submission) {
        if (err) {
          debug.submission(err);
          return next(err);
        }
        if (!submission) {
          debug.submission('No submission found with subId: ' + subId);
          return next();
        }

        submission.deleted = (new Date()).getTime();
        submission.save(function(err, submission) {
          if (err) {
            debug.submission(err);
            return next(err);
          }

          debug.submission(submission);
          next(null, submission);
        });
      });
    }
    else {
      router.formio.resources.submission.model.find({form: {$in: forms}, deleted: {$eq: null}})
        .exec(function(err, submissions) {
          if (err) {
            debug.submission(err);
            return next(err);
          }
          if (!submissions || submissions.length === 0) {
            debug.submission('No submissions found for the forms: ' + JSON.stringify(forms));
            return next();
          }

          submissions.forEach(function(submission) {
            submission.deleted = (new Date()).getTime();
            submission.save(function(err, submission) {
              if (err) {
                debug.submission(err);
                return next(err);
              }

              debug.submission(submission);
            });
          });

          next();
        });
    }
  };

  /**
   * Flag an Action as deleted. If given a actionId, one action will be flagged; if given a formId, or array of formIds,
   * then all the Actions for that form, or forms, will be flagged.
   *
   * @param actionId {string|ObjectId}
   *   The Action id to flag as deleted.
   * @param forms {string|ObjectId|array}
   *   A list of form ids to flag all Actions as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteAction = function(actionId, forms, next) {
    if (!actionId && !forms) {
      debug.action('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    if (actionId) {
      router.formio.actions.model.findOne({_id: actionId, deleted: {$eq: null}}, function(err, action) {
        if (err) {
          debug.action(err);
          return next(err);
        }
        if (!action) {
          debug.action('No action found with _id: ' + actionId);
          return next();
        }

        action.deleted = (new Date()).getTime();
        action.save(function(err, action) {
          if (err) {
            debug.action(err);
            return next(err);
          }

          debug.action(action);
          next();
        });
      });
    }
    else {
      router.formio.actions.model.find({form: {$in: forms}, deleted: {$eq: null}}, function(err, actions) {
        if (err) {
          debug.action(err);
          return next(err);
        }
        if (!actions || actions.length === 0) {
          debug.action('No action found with form _id\'s: ' + JSON.stringify(forms));
          return next();
        }

        actions.forEach(function(action) {
          action.deleted = (new Date()).getTime();
          action.save(function(err, action) {
            if (err) {
              debug.action(err);
              return next(err);
            }

            debug.action(action);
          });
        });

        // Continue once all the forms have been updated.
        next();
      });
    }
  };

  /**
   * Flag a form as deleted. If given a formId, one form will be flagged;
   *
   * @param formId {string|ObjectId}}
   *   The form id to flag as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteForm = function(formId, next) {
    if (!formId) {
      debug.form('Skipping');
      return next();
    }

    router.formio.resources.form.model.findOne({_id: formId, deleted: {$eq: null}}, function(err, form) {
      if (err) {
        debug.form(err);
        return next(err);
      }
      if (!form) {
        debug.form('No form found with the _id: ' + formId);
        return next();
      }

      form.deleted = (new Date()).getTime();
      form.save(function(err, form) {
        if (err) {
          debug.form(err);
          return next(err);
        }

        deleteAction(null, formId, function(err) {
          if (err) {
            debug.form(err);
            return next(err);
          }

          deleteSubmission(null, formId, function(err) {
            if (err) {
              debug.form(err);
              return next(err);
            }

            debug.form(form);
            next();
          });
        });
      });
    });
  };

  /**
   *
   * @param roleId
   * @param next
   * @returns {*}
   */
  var deleteRoleAccess = function(roleId, req, next) {
    if (!roleId) {
      debug.roleAccess('Skipping');
      return next();
    }

    // Convert the roldId to a string for comparison.
    roleId = roleId.toString();

    // The access types to check.
    var accessType = ['access', 'submissionAccess'];

    // The formIds to check.
    var formIds = null;

    /**
     * Remove the roleId from the forms' access types.
     *
     * @param cb {function}
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
      router.formio.resources.form.model.find(query)
        .snapshot(true)
        .exec(function(err, forms) {
          if (err) {
            debug.roleAccess(err);
            return cb(err);
          }
          if (!forms || forms.length === 0) {
            debug.roleAccess('No forms found with the query: ' + JSON.stringify(query));
            return cb();
          }

          // Iterate each form and remove the role.
          debug.roleAccess('Found ' + forms.length + ' forms to modify.');
          async.eachSeries(forms, function(form, done) {
            // Iterate each access type to remove the role.
            accessType.forEach(function(access) {
              var temp = form.toObject()[access] || [];

              // Iterate the roles for each permission type, and remove the given roleId.
              for (var b = 0; b < temp.length; b++) {
                // Convert the ObjectIds to strings for comparison.
                temp[b].roles = _.map((temp[b].roles || []), function(e) {
                  return e.toString();
                });

                // Remove the given roleId if it was defined in the access.
                if (temp[b].roles.indexOf(roleId) !== -1) {
                  _.pull(temp[b].roles, roleId);
                }
              }

              form.set(access, temp);
            });

            form.save(function(err, form) {
              if (err) {
                debug.roleAccess(err);
                return done(err);
              }

              debug.roleAccess(JSON.stringify(form));
              done();
            });
          }, function(err) {
            if (err) {
              debug.roleAccess(err);
              return cb(err);
            }

            cb();
          });
        });
    };

    /**
     * Remove the roleId from the submissions for the given formIds.
     *
     * @param cb {function}
     *   The callback function to invoke after the roles have been removed.
     */
    var removeFromSubmissions = function(cb) {
      // Find all submissions that contain the role in its roles.
      var query = {form: {$in: formIds}, deleted: {$eq: null}, roles: roleId};
      router.formio.resources.submission.model.find(query)
        .snapshot(true)
        .exec(function(err, submissions) {
          if (err) {
            debug.roleAccess(err);
            return cb(err);
          }
          if (!submissions || submissions.length === 0) {
            debug.roleAccess('No submissions found with given query: ' + JSON.stringify(query));
            return cb();
          }

          // Iterate each submission to filter the roles.
          async.eachSeries(submissions, function(submission, done) {
            var temp = _.map((submission.toObject().roles || []), function(e) {
              return e.toString();
            });

            // Omit the given role from all submissions.
            if (temp.indexOf(roleId) !== -1) {
              _.pull(temp, roleId);
            }

            submission.set('roles', temp);
            submission.save(function(err, submission) {
              if (err) {
                debug.roleAccess(err);
                return done(err);
              }

              debug.roleAccess(submission);
              done();
            });
          }, function(err) {
            if (err) {
              debug.roleAccess(err);
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
          return next(err);
        }
        if (!forms) {
          return next();
        }

        // update the list of formIds
        formIds = _.map(forms, function(form) {
          return form.toObject()._id.toString();
        });
        debug.roleAccess('Forms: ' + JSON.stringify(formIds));

        async.series([
          removeFromForm,
          removeFromSubmissions
        ], function(err) {
          if (err) {
            debug.roleAccess(err);
            return next(err);
          }

          next();
        });
      });
  };

  /**
   * Flag a Role as deleted. If given a roleId, one Role will be flagged;
   *
   * @param roleId {string|ObjectId}
   *   The Role id to flag as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteRole = function(roleId, req, next) {
    if (!roleId) {
      debug.role('Skipping');
      return next();
    }

    router.formio.resources.role.model.findOne({_id: roleId, deleted: {$eq: null}}, function(err, role) {
      if (err) {
        debug.role(err);
        return next(err);
      }
      if (!role) {
        debug.role('No role found with _id: ' + roleId);
        return next();
      }

      role.deleted = (new Date()).getTime();
      role.save(function(err, role) {
        if (err) {
          debug.role(err);
          return next(err);
        }

        deleteRoleAccess(roleId, req, function(err) {
          if (err) {
            debug.role(err);
            return next(err);
          }

          debug.role(role);
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
