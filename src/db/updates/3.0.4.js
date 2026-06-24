'use strict';

let async = require('async');
let _ = require('lodash');

/**
 * Update 3.0.4
 *
 * This update does the following.
 *
 *   1.) Verifies that the default role exists.
 *   2.) Verifies that the admin role exists.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let roleCollection = db.collection('roles');

  async.series([
    function checkDefaultRole(callback) {
      roleCollection.countDocuments({deleted: {$eq: null}, default: true})
      .then(count => {
        // Insert the default role
        if (count === 0) {
          roleCollection.insertOne({
            title: 'Default',
            description: 'The Default Role.',
            deleted: null,
            admin: false,
            default: true
          })
          .then(response => {
            callback();
          })
          .catch(err => next(err));
        }
        // Default role exists.
        else if (count === 1) {
          return callback();
        }
        else {
          console.log('Unknown count of the default role: ' + count);
          return callback();
        }
      })
      .catch(err => callback(err));
    },
    function checkAdminRole(callback) {
      roleCollection.countDocuments({deleted: {$eq: null}, admin: true})
      .then(count => {
        // Insert the default role
        if (count === 0) {
          roleCollection.insertOne({
            title: 'Administrator',
            description: 'The Administrator Role.',
            deleted: null,
            admin: true,
            default: false
          })
          .then(response => {
            callback();
          })
          .catch(err => next(err));
        }
        // Default role exists.
        else if (count === 1) {
          return callback();
        }
        else {
          console.log('Unknown count of the admin role: ' + count);
          return callback();
        }
      })
      .catch(err => callback(err));
    }
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
