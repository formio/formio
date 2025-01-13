'use strict';

let util = require('../../util/util');
let _ = require('lodash');

/**
 * Update 3.0.3
 *
 * This update does the following.
 *
 *   1.) For all "resource" actions, add a "save" action with the assigned resource.
 *   2.) Add a "save" action with no assigned resource to every form WITHOUT the "nosubmit" or "resetpass" action.
 *   3.) Deletes the "nosubmit" action.
 *   4.) Deletes the "resource" action.
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function(db, config, tools) {
  let actionCollection = db.collection('actions');
  let formCollection = db.collection('forms');

  // Iterate through all forms.
  formCollection.find({}).toArray()
    .then(forms => {
      // Iterate through each form.
      let formsUpdated = 0;
      console.log('Updating ' + forms.length + ' forms.');
      return Promise.all(forms.map(form => {
        return actionCollection.find({ form: form._id }).toArray()
          .then(actions => {
            let resourceAction = _.find(actions, { name: 'resource' });
            let noSubmitAction = _.find(actions, { name: 'nosubmit' });
            let resetpassAction = _.find(actions, { name: 'resetpass' });

            let updatePromises = [];

            if (resourceAction) {
              // Handle #1 case
              updatePromises.push(
                actionCollection.insertOne({
                  name: 'save',
                  title: 'Save Submission',
                  form: form._id,
                  priority: 10,
                  handler: ['before'],
                  method: ['create', 'update'],
                  machineName: resourceAction.machineName.replace(':resource', ':save'),
                  deleted: null,
                  settings: {
                    resource: resourceAction.settings.resource,
                    fields: resourceAction.settings.fields
                  }
                })
              );

              // Handle #4 case
              updatePromises.push(actionCollection.deleteOne({ _id: resourceAction._id }));
            }

            if (noSubmitAction) {
              // Handle #3 case
              updatePromises.push(actionCollection.deleteOne({ _id: noSubmitAction._id }));
            } else if (!resetpassAction) {
              // Handle #2 case
              updatePromises.push(
                actionCollection.insertOne({
                  name: 'save',
                  title: 'Save Submission',
                  form: form._id,
                  priority: 10,
                  handler: ['before'],
                  method: ['create', 'update'],
                  deleted: null,
                  settings: {}
                })
              );
            }

            formsUpdated++;
            if ((formsUpdated % 100) === 0) {
              console.log('Updated ' + formsUpdated + ' forms');
            }

            return Promise.all(updatePromises);
          });
      }));
    });
};
