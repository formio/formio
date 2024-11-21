'use strict';

let util = require('../../util/util');
let _ = require('lodash');
let ObjectId = require('mongodb').ObjectId;

/**
 * Update 3.0.2
 *
 * This update does the following.
 *
 *   1.) Ensure that all resources that are authenticated have a role assignment action.
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function(db, config, tools) {
  let actionCollection = db.collection('actions');
  let formCollection = db.collection('forms');

  // Find all resource actions.
  actionCollection.find({ name: 'resource' }).toArray()
    .then(actions => {
      return Promise.all(actions.map(action => {
        let formId;

        try {
          formId = ObjectId(action.settings.resource);
        } catch (err) {
          return Promise.resolve();
        }

        if (!formId) {
          return Promise.resolve();
        }

        // Find all actions associated with the resource.
        return actionCollection.find({form: formId}).toArray()
          .then(resourceActions => {
            let roleAction = _.find(resourceActions, {name: 'role'});
            if (!roleAction) {
              return actionCollection.insert({
                title: 'Role Assignment',
                name: 'role',
                priority: 1,
                handler: ['after'],
                method: ['create'],
                form: formId,
                settings: {
                  association: 'new',
                  type: 'add',
                  role: action.settings.role.toString()
                }
              });
            }
            return Promise.resolve();
          });
      }));
    });
};
