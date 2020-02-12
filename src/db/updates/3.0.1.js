'use strict';

let async = require('async');
let util = require('../../util/util');

/**
 * Update 3.0.1
 *
 * This update takes all of the auth actions and turns them into a series of other actions that provide a more
 * flexible authentication system.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let actionCollection = db.collection('actions');
  let formCollection = db.collection('forms');
  actionCollection.find({
    name: 'auth'
  }).snapshot({$snapshot: true}).toArray(function(err, actions) {
    if (err) {
      return done(err);
    }

    // Iterate through all of the actions.
    async.forEachOf(actions, function(action, key, next) {
      if (!action.settings.username || !action.settings.password) { return next(); }

      // Load the form this action is attached to.
      formCollection.findOne({_id: action.form}, function(err, form) {
        if (err) { return next(err); }
        if (!form || !form._id) { return next(); }

        let userparts = action.settings.username.split('.');
        let passparts = action.settings.password.split('.');
        let resource = userparts[0];

        let resourceFields = {};
        util.eachComponent(form.components, function(component) {
          if (component.validate && component.validate.custom) {
            component.validate.custom = component.validate.custom.replace(resource + '.password', 'password');
          }
          if (component.key) {
            let subparts = component.key.split('.');
            if ((subparts.length > 1) && (subparts[0] === resource)) {
              component.key = subparts[1];
              resourceFields[subparts[1]] = subparts[1];
            }
          }
        });

        // Update the form with the new component keys.
        formCollection.updateOne({_id:form._id}, {$set:{components:form.components}});

        // Query for the resource this auth action is pointing to.
        let query = {name: resource};
        if (form.hasOwnProperty('project')) {
          query.project = form.project;
        }

        // Load the associated form.
        formCollection.findOne(query, function(err, resourceForm) {
          if (err) { return next(err); }
          if (!resourceForm || !resourceForm._id) { return next(); }

          // Create the new actions for authentication and registration.
          if (action.settings.association === 'new') {
            actionCollection.insert({
              name: 'resource',
              title: 'Submit to another Resource',
              form: form._id,
              priority: 10,
              method: ['create'],
              handler: ['before'],
              machineName: action.machineName.replace(':auth', ':resource'),
              deleted: null,
              settings: {
                resource: resourceForm._id.toString(),
                fields: resourceFields,
                role: action.settings.role
              }
            });
          }
          actionCollection.insert({
            name: 'login',
            title: 'Login',
            form: form._id,
            priority: 2,
            method: ['create'],
            handler: ['before'],
            machineName: action.machineName.replace(':auth', ':login'),
            deleted: null,
            settings: {
              resources: [resourceForm._id.toString()],
              username: userparts[1],
              password: passparts[1]
            }
          });
          actionCollection.insert({
            name: 'nosubmit',
            title: 'Skip Form Submission',
            form: form._id,
            priority: 0,
            method: ['create'],
            handler: ['before'],
            machineName: action.machineName.replace(':auth', ':nosubmit'),
            deleted: null
          });

          actionCollection.deleteOne({_id: action._id});
          next();
        });
      });
    }, function(err) {
      if (err) {
        return done(err);
      }
      done();
    });
  });
};
