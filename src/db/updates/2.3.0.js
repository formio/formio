'use strict';

let _ = require('lodash');
let async = require('async');
let ObjectId = require('mongodb').ObjectId;

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
  let forms = db.collection('forms');
  let actions = db.collection('actions');
  let roles = db.collection('roles');
  let projects = db.collection('projects');

  // The list of forms that have already been modified.
  let alreadyDone = [];

  // The list of all the forms in the system.
  let allForms = [];

  // A mapping of formId:projectId
  let formsAndProjects = [];

  // Remove all auth actions that dont have settings.
  let pruneAuthActions = function(cb) {
    actions.deleteMany({name: 'auth', settings: {$eq: null}}, function(err, result) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  // Get all the forms in the platform, with their projectId's
  let getAllForms = function(cb) {
    forms.find({deleted: {$eq: null}}, {project: 1}).snapshot({$snapshot: true}).toArray(cb);
  };

  let filterForms = function(documents, cb) {
    // Map the forms for later lookups
    allForms = _.map(documents, function(element) {
      formsAndProjects[element._id.toString()] = formsAndProjects[element._id.toString()] || element.project.toString();
      return element._id.toString();
    });

    cb();
  };

  // Get all the auth and role actions in the system.
  let getAllActions = function(cb) {
    let query = {deleted: {$eq: null}, $or: [{name: 'auth'}, {name: 'role'}]};
    actions.find(query).snapshot({$snapshot: true}).toArray(cb);
  };

  // Sort the actions by formId, so we can merge Auth/Role actions on forms.
  let filterActions = function(documents, cb) {
    // The formId:[actionId] pairs.
    let filteredActions = {};
    documents.forEach(function(element) {
      filteredActions[element.form.toString()] = filteredActions[element.form.toString()] || [];
      filteredActions[element.form.toString()].push(element);
    });

    cb(null, filteredActions);
  };

  // Update the auth action with the given actionId, to have the roleId as the default role assignment.
  let updateAuthenticationAction = function(actionId, roleId, cb) {
    let query = {_id: ObjectId(actionId)};
    let update = {$set: {'settings.role': ObjectId(roleId)}};
    actions.updateOne(query, update, cb);
  };

  // Delete the roleAction with the given actionId;
  let deleteRoleAction = function(actionId, cb) {
    let query = {_id: ObjectId(actionId)};
    actions.findOneAndDelete(query, cb);
  };

  // Condense the given actions (role and auth), to be a single authentication action.
  let condenseActions = function(formActions, formId, cb) {
    let role = null;
    let roleActionId = null;
    let authActionId = null;
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

  let processActions = function(filteredActions, cb) {
    async.forEachOfSeries(filteredActions, function(formActions, formId, callback) {
      if (!(formActions instanceof Array)) {
        return callback('Expected Array, got: ' + JSON.stringify(formActions))
      }
      if (formActions.length > 2) {
        return callback('The form ' + formId.toString() + ', has duplicate actions.. ' + JSON.stringify(formActions));
      }

      if (formActions.length === 2) {
        let association = null;
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
  let findAuthActionsToMigrate = function(cb) {
    let query = {name: 'auth', 'settings.association': 'new', form: {$nin: alreadyDone}, deleted: {$eq: null}};
    actions.find(query).snapshot({$snapshot: true}).toArray(cb);
  };

  // Get the authenticated role for the project containing the given formId.
  let getAuthenticatedRole = function(formId, cb) {
    let proj = formsAndProjects[formId];

    // Special case for boardman project.
    if (proj === '552b2297d70ef854300001e5') {
      let query = {title: 'Agent', project: ObjectId(proj), deleted: {$eq: null}};
      roles.find(query).snapshot({$snapshot: true}).toArray(cb);
    }
    else {
      let query = {title: 'Authenticated', project: ObjectId(proj), deleted: {$eq: null}};
      roles.find(query).snapshot({$snapshot: true}).toArray(cb);
    }
  };

  let addRoleToAuthAction = function(actionId, roleId, cb) {
    let query = {_id: ObjectId(actionId)};
    let update = {$set: {'settings.role': ObjectId(roleId.toString())}};
    actions.updateOne(query, update, function(err, result) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  // Migrate any auth actions that were not configured with role actions.
  let migrateAuthActions = function(documents, cb) {
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

  let checkMigrations = function(cb) {
    let checkRoleActions = function(callback) {
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

    let checkAuthActions = function(callback) {
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

    let checkBothActions = function(callback) {
      actions.find({$or: [{name: 'auth'}, {name: 'role'}], deleted: {$eq: null}})
        .snapshot({$snapshot: true}).toArray(function(err, documents) {
          if (err) {
            return callback(err);
          }
          if (!documents || documents.length === 0) {
            return callback();
          }

          let allFormIds = [];
          let formsAndActions = {};
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
