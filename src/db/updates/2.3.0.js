'use strict';

let _ = require('lodash');
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
module.exports = async function(db, config, tools, done) {
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
  let pruneAuthActions = async function() {
    await actions.deleteMany({ name: 'auth', settings: { $eq: null } });
  };

  // Get all the forms in the platform, with their projectId's
  let getAllForms = async function() {
    let result = await forms.find({ deleted: { $eq: null } }, { project: 1 }).toArray();
    return result;
  };

  let filterForms = function(documents) {
    // Map the forms for later lookups
    allForms = _.map(documents, function(element) {
      formsAndProjects[element._id.toString()] = formsAndProjects[element._id.toString()] || element.project.toString();
      return element._id.toString();
    });
  };

  // Get all the auth and role actions in the system.
  let getAllActions = async function() {
    let query = { deleted: { $eq: null }, $or: [{ name: 'auth' }, { name: 'role' }] };
    let result = await actions.find(query).toArray();
    return result;
  };

  // Sort the actions by formId, so we can merge Auth/Role actions on forms.
  let filterActions = function(documents) {
    // The formId:[actionId] pairs.
    let filteredActions = {};
    documents.forEach(function(element) {
      filteredActions[element.form.toString()] = filteredActions[element.form.toString()] || [];
      filteredActions[element.form.toString()].push(element);
    });
    return filteredActions;
  };

  // Update the auth action with the given actionId, to have the roleId as the default role assignment.
  let updateAuthenticationAction = async function(actionId, roleId) {
    let query = { _id: ObjectId(actionId) };
    let update = { $set: { 'settings.role': ObjectId(roleId) } };
    await actions.updateOne(query, update);
  };

  // Delete the roleAction with the given actionId;
  let deleteRoleAction = async function(actionId) {
    let query = { _id: ObjectId(actionId) };
    await actions.findOneAndDelete(query);
  };

  // Condense the given actions (role and auth), to be a single authentication action.
  let condenseActions = async function(formActions, formId) {
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
      throw new Error('No roleId found in the role assignment action.' + JSON.stringify(formActions));
    }
    if (roleActionId === null) {
      throw new Error('No actionId found in the role assignment action.' + JSON.stringify(formActions));
    }

    // Before completing the process, add the formId to the list of already processed forms.
    await updateAuthenticationAction(authActionId, role);
    await deleteRoleAction(roleActionId);
    alreadyDone.push(formId);
  };

  let processActions = async function(filteredActions) {
    for (let formId in filteredActions) {
      let formActions = filteredActions[formId];
      if (!(formActions instanceof Array)) {
        throw new Error('Expected Array, got: ' + JSON.stringify(formActions));
      }
      if (formActions.length > 2) {
        throw new Error('The form ' + formId.toString() + ', has duplicate actions.. ' + JSON.stringify(formActions));
      }

      if (formActions.length === 2) {
        let association = null;
        formActions.forEach(function(action) {
          if (!action.settings || !action.settings.hasOwnProperty('association')) {
            throw new Error('Expected the action to have association settings... ' + JSON.stringify(action));
          }

          if (association === null) {
            association = action.settings.association;
          } else {
            association = ((association === 'new') && (association === action.settings.association))
              ? 'new'
              : 'existing';
          }
        });

        // There are 2 form actions that need to be condensed.
        if (association === 'new') {
          console.log('Condensing: actions for form: ' + formId);
          await condenseActions(formActions, formId);
        }
      }
    }
  };

  // Find all the auth actions that have not been already migrated.
  let findAuthActionsToMigrate = async function() {
    let query = { name: 'auth', 'settings.association': 'new', form: { $nin: alreadyDone }, deleted: { $eq: null } };
    let result = await actions.find(query).toArray();
    return result;
  };

  // Get the authenticated role for the project containing the given formId.
  let getAuthenticatedRole = async function(formId) {
    let proj = formsAndProjects[formId];

    // Special case for boardman project.
    if (proj === '552b2297d70ef854300001e5') {
      let query = { title: 'Agent', project: ObjectId(proj), deleted: { $eq: null } };
      let result = await roles.find(query).toArray();
      return result;
    } else {
      let query = { title: 'Authenticated', project: ObjectId(proj), deleted: { $eq: null } };
      let result = await roles.find(query).toArray();
      return result;
    }
  };

  let addRoleToAuthAction = async function(actionId, roleId) {
    let query = { _id: ObjectId(actionId) };
    let update = { $set: { 'settings.role': ObjectId(roleId.toString()) } };
    await actions.updateOne(query, update);
  };

  // Migrate any auth actions that were not configured with role actions.
  let migrateAuthActions = async function(documents) {
    for (let action of documents) {
      let roles = await getAuthenticatedRole(action.form.toString());
      if (!roles || ((roles instanceof Array) && roles.length === 0)) {
        throw new Error('No roles were found for the project containing the form: ' + action.form.toString() + ', ' + JSON.stringify(roles));
      }
      if ((roles instanceof Array) && roles.length !== 1) {
        throw new Error('More than one role was returned for the project... Expected 1: ' + JSON.stringify(roles));
      }

      await addRoleToAuthAction(action._id.toString(), roles[0]._id.toString());
    }
  };

  let checkMigrations = async function() {
    let checkRoleActions = async function() {
      let documents = await actions.find({ name: 'role', deleted: { $eq: null } }).toArray();
      if (documents && documents.length > 0) {
        console.log(documents.length + ' role actions remaining');
        documents.forEach(function(doc) {
          console.log('_id: ' + doc._id + ', form: ' + doc.form);
        });
      }
    };

    let checkAuthActions = async function() {
      let documents = await actions.find({ name: 'auth', deleted: { $eq: null }, 'settings.role': { $eq: null }, 'settings.association': 'new' }).toArray();
      if (documents && documents.length > 0) {
        console.log('Found ' + documents.length + ' auth actions w/ no role and `new` association, expected 0.');
        documents.forEach(function(doc) {
          console.log('_id: ' + doc._id + ', form._id: ' + doc.form);
        });
      }
    };

    let checkBothActions = async function() {
      let documents = await actions.find({ $or: [{ name: 'auth' }, { name: 'role' }], deleted: { $eq: null } }).toArray();
      if (documents && documents.length > 0) {
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
      }
    };

    await checkAuthActions();
    await checkBothActions();
  };

  // Consolidate the actions for all forms.
  try {
    await pruneAuthActions();
    let allForms = await getAllForms();
    filterForms(allForms);
    let allActions = await getAllActions();
    let filteredActions = filterActions(allActions);
    await processActions(filteredActions);
    let authActionsToMigrate = await findAuthActionsToMigrate();
    await migrateAuthActions(authActionsToMigrate);
    await checkMigrations();
    done();
  } catch (err) {
    console.log(err);
    done(err);
  }
};
