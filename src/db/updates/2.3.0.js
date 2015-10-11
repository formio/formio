'use strict';

var _ = require('lodash');
var async = require('async');
var ObjectId = require('mongodb').ObjectID;

/**
 * Update 2.3.0
 *
 * Migrate all forms with the auth + role action to be just the auth action. Upgrade all auth actions to use a default
 * role for new resources.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  var forms = db.collection('forms');
  var actions = db.collection('actions');
  var roles = db.collection('roles');
  var projects = db.collection('projects');

  // The list of forms that have already been modified.
  var alreadyDone = [];

  // The list of all the forms in the system.
  var allForms = [];

  // A mapping of formId:projectId
  var formsAndProjects = [];

  // Remove all auth actions that dont have settings.
  var pruneAuthActions = function(cb) {
    actions.deleteMany({name: 'auth', settings: {$eq: null}}, function(err, result) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  // Get all the forms in the platform, with their projectId's
  var getAllForms = function(cb) {
    forms.find({deleted: {$eq: null}}, {project: 1}).snapshot({$snapshot: true}).toArray(cb);
  };

  var filterForms = function(documents, cb) {
    // Map the forms for later lookups
    allForms = _.map(documents, function(element) {
      formsAndProjects[element._id.toString()] = formsAndProjects[element._id.toString()] || element.project.toString();
      return element._id.toString();
    });

    cb();
  };

  // Get all the auth and role actions in the system.
  var getAllActions = function(cb) {
    var query = {deleted: {$eq: null}, $or: [{name: 'auth'}, {name: 'role'}]};
    actions.find(query).snapshot({$snapshot: true}).toArray(cb);
  };

  // Sort the actions by formId, so we can merge Auth/Role actions on forms.
  var filterActions = function(documents, cb) {
    // The formId:[actionId] pairs.
    var filteredActions = {};
    documents.forEach(function(element) {
      filteredActions[element.form.toString()] = filteredActions[element.form.toString()] || [];
      filteredActions[element.form.toString()].push(element);
    });

    cb(null, filteredActions);
  };

  // Update the auth action with the given actionId, to have the roleId as the default role assignment.
  var updateAuthenticationAction = function(actionId, roleId, cb) {
    var query = {_id: ObjectId(actionId)};
    var update = {$set: {'settings.role': ObjectId(roleId)}};
    actions.findOneAndUpdate(query, update, cb);
  };

  // Delete the roleAction with the given actionId;
  var deleteRoleAction = function(actionId, cb) {
    var query = {_id: ObjectId(actionId)};
    actions.findOneAndDelete(query, cb);
  };

  // Condense the given actions (role and auth), to be a single authentication action.
  var condenseActions = function(formActions, formId, cb) {
    var role = null;
    var roleActionId = null;
    var authActionId = null;
    formActions.forEach(function(action) {
      if (action.name === 'role') {
        roleActionId = action._id.toString();
        role = (action.settings && action.settings.hasOwnProperty('role'))
          ? action.settings.role
          : null;
      }
      if (action.name === 'auth') {
        authActionId = action._id.toString();
      }
    });

    // Validation
    if (role === null) {
      return cb('No roleId found in the role assignment action.' + JSON.stringify(formActions));
    }
    if (roleActionId === null) {
      return cb('No actionId found in the role assignment action.' + JSON.stringify(formActions));
    }

    // Before completing the process, add the formId to the list of already processed forms.
    updateAuthenticationAction(authActionId, role, function(err) {
      if (err) {
        return cb(err);
      }

      deleteRoleAction(roleActionId, function(err) {
        if (err) {
          return cb(err);
        }

        alreadyDone.push(formId);
        cb();
      });
    });
  };

  var processActions = function(filteredActions, cb) {
    async.forEachOfSeries(filteredActions, function(formActions, formId, callback) {
      if (!(formActions instanceof Array)) {
        return callback('Expected Array, got: ' + JSON.stringify(formActions))
      }
      if (formActions.length > 2) {
        return callback('The form ' + formId.toString() + ', has duplicate actions.. ' + JSON.stringify(formActions));
      }

      if (formActions.length === 2) {
        var association = null;
        formActions.forEach(function(action) {
          if (!action.settings || !action.settings.hasOwnProperty('association')) {
            return callback('Expected the action to have association settings... ' + JSON.stringify(action));
          }

          if (association === null) {
            association = action.settings.association;
          }
          else {
            association = ((association === 'new') && (association === action.settings.association))
              ? 'new'
              : 'existing';
          }
        });

        // There are 2 form actions that need to be condensed.
        if (association === 'new') {
          console.log('Condensing: actions for form: ' + formId);
          condenseActions(formActions, formId, function(err) {
            if (err) {
              return callback(err);
            }

            callback();
          });
        }
        else {
          // We dont care about adding roles to `existing` resource options.
          callback();
        }
      }
      else {
        // only 1 action defined on the form (auth or role).
        callback();
      }
    }, function(err) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  // Find all the auth actions that have not been already migrated.
  var findAuthActionsToMigrate = function(cb) {
    var query = {name: 'auth', 'settings.association': 'new', form: {$nin: alreadyDone}, deleted: {$eq: null}};
    actions.find(query).snapshot({$snapshot: true}).toArray(cb);
  };

  // Get the authenticated role for the project containing the given formId.
  var getAuthenticatedRole = function(formId, cb) {
    var proj = formsAndProjects[formId];

    // Special case for boardman project.
    if (proj === '552b2297d70ef854300001e5') {
      var query = {title: 'Agent', project: ObjectId(proj), deleted: {$eq: null}};
      roles.find(query).snapshot({$snapshot: true}).toArray(cb);
    }
    else {
      var query = {title: 'Authenticated', project: ObjectId(proj), deleted: {$eq: null}};
      roles.find(query).snapshot({$snapshot: true}).toArray(cb);
    }
  };

  var addRoleToAuthAction = function(actionId, roleId, cb) {
    var query = {_id: ObjectId(actionId)};
    var update = {$set: {'settings.role': ObjectId(roleId.toString())}};
    actions.findOneAndUpdate(query, update, function(err, result) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  // Migrate any auth actions that were not configured with role actions.
  var migrateAuthActions = function(documents, cb) {
    async.eachSeries(documents, function(action, callback) {
      async.waterfall([
        function(next) {
          getAuthenticatedRole(action.form.toString(), next)
        },
        function(roles, next) {
          if (!roles || ((roles instanceof Array) && roles.length === 0)) {
            return next('No roles were found for the project containing the form: ' + action.form.toString() + ', ' + JSON.stringify(roles));
          }
          if ((roles instanceof Array) && roles.length !== 1) {
            return next('More than one role was returned for the project... Expected 1: ' + JSON.stringify(roles))
          }

          addRoleToAuthAction(action._id.toString(), roles[0]._id.toString(), next);
        }
      ], function(err) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    }, function(err) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  var checkMigrations = function(cb) {
    var checkRoleActions = function(callback) {
      actions.find({name: 'role', deleted: {$eq: null}}).snapshot({$snapshot: true}).toArray(function(err, documents) {
        if (err) {
          return callback(err);
        }
        if (!documents || documents.length === 0) {
          return callback();
        }

        console.log(documents.length + ' role actions remaining');
        documents.forEach(function(doc) {
          console.log('_id: ' + doc._id + ', form: ' + doc.form);
        });
        callback();
      });
    };

    var checkAuthActions = function(callback) {
      actions.find({name: 'auth', deleted: {$eq: null}, 'settings.role': {$eq: null}, 'settings.association': 'new'})
        .snapshot({$snapshot: true}).toArray(function(err, documents) {
          if (err) {
            return callback(err);
          }
          if (!documents || documents.length === 0) {
            return callback();
          }

          console.log('Found ' + documents.length + ' auth actions w/ no role and `new` association, expected 0.');
          documents.forEach(function(doc) {
            console.log('_id: ' + doc._id + ', form._id: ' + doc.form);
          });
          callback();
        });
    };

    var checkBothActions = function(callback) {
      actions.find({$or: [{name: 'auth'}, {name: 'role'}], deleted: {$eq: null}})
        .snapshot({$snapshot: true}).toArray(function(err, documents) {
          if (err) {
            return callback(err);
          }
          if (!documents || documents.length === 0) {
            return callback();
          }

          var allFormIds = [];
          var formsAndActions = {};
          documents.forEach(function(doc) {
            allFormIds.push(doc.form.toString());

            formsAndActions[doc.form.toString()] = formsAndActions[doc.form.toString()] || [];
            formsAndActions[doc.form.toString()].push(doc._id.toString());
          });

          allFormIds = _.uniq(allFormIds);
          allFormIds.forEach(function(id) {
            if (formsAndActions[id] && formsAndActions[id].length > 1) {
              console.log('Found unexpected form w/ auth actions and role actions, form._id: ' + id);
            }
          });

          callback();
        });
    };

    async.series([
      checkAuthActions,
      checkBothActions
    ], function(err) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  // Consolidate the actions for all forms.
  async.waterfall([
    pruneAuthActions,
    getAllForms,
    filterForms,
    getAllActions,
    filterActions,
    processActions,
    findAuthActionsToMigrate,
    migrateAuthActions,
    checkMigrations
  ], function(err) {
    if (err) {
      console.log(err);
      return done(err);
    }

    return done();
  });
};
