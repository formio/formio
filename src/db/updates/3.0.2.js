'use strict';

let async = require('async');
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
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let actionCollection = db.collection('actions');
  let formCollection = db.collection('forms');

  // Find all resource actions.
  actionCollection.find({name: 'resource'}).snapshot({$snapshot: true}).toArray(function(err, actions) {
    if (err) {
      return done(err);
    }

    async.forEachOf(actions, function(action, key, next) {

      let formId = '';
      try {
        formId = ObjectId(action.settings.resource);
      }
      catch (err) {
        return next();
      }

      if (!formId) {
        return next();
      }

      // Find all actions associated with the resource.
      actionCollection.find({form: formId}).snapshot({$snapshot: true}).toArray(function(err, resourceActions) {
        let roleAction = _.find(resourceActions, {name: 'role'});
        if (!roleAction) {
          actionCollection.insert({
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
          }, function() {
            next();
          });
        }
        else {
          next();
        }
      });
    }, done);
  });
};
