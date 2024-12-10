'use strict';

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
 */
module.exports = function(db, config, tools) {
  let actionCollection = db.collection('actions');
  let formCollection = db.collection('forms');
  actionCollection.find({ name: 'auth' }).toArray()
    .then(actions => {
      return Promise.all(actions.map(action => {
        if (!action.settings.username || !action.settings.password) {
          return Promise.resolve();
        }

        // Load the form this action is attached to.
        return formCollection.findOne({ _id: action.form })
          .then(form => {
            if (!form || !form._id) {
              return Promise.resolve();
            }

            let userparts = action.settings.username.split('.');
            let passparts = action.settings.password.split('.');
            let resource = userparts[0];

            let resourceFields = {};
            util.eachComponent(form.components, component => {
              if (component.validate && component.validate.custom) {
                component.validate.custom = component.validate.custom.replace(resource + '.password', 'password');
              }
              if (component.key) {
                let subparts = component.key.split('.');
                if (subparts.length > 1 && subparts[0] === resource) {
                  component.key = subparts[1];
                  resourceFields[subparts[1]] = subparts[1];
                }
              }
            });

            // Update the form with the new component keys.
            return formCollection.updateOne({ _id: form._id }, { $set: { components: form.components } })
              .then(() => {
                // Query for the resource this auth action is pointing to.
                let query = { name: resource };
                if (form.hasOwnProperty('project')) {
                  query.project = form.project;
                }

                // Load the associated form.
                return formCollection.findOne(query)
                  .then(resourceForm => {
                    if (!resourceForm || !resourceForm._id) {
                      return Promise.resolve();
                    }

                    // Create the new actions for authentication and registration.
                    let insertPromises = [];

                    if (action.settings.association === 'new') {
                      insertPromises.push(
                        actionCollection.insertOne({
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
                        })
                      );
                    }

                    insertPromises.push(
                      actionCollection.insertOne({
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
                      })
                    );

                    insertPromises.push(
                      actionCollection.insertOne({
                        name: 'nosubmit',
                        title: 'Skip Form Submission',
                        form: form._id,
                        priority: 0,
                        method: ['create'],
                        handler: ['before'],
                        machineName: action.machineName.replace(':auth', ':nosubmit'),
                        deleted: null
                      })
                    );

                    return Promise.all(insertPromises)
                      .then(() => actionCollection.deleteOne({ _id: action._id }));
                  });
              });
          });
      }));
    });
};
