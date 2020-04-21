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
      roleCollection.countDocuments({deleted: {$eq: null}, default: true}, function(err, count) {
        if (err) {
          return callback(err);
        }

        // Insert the default role
        if (count === 0) {
          roleCollection.insertOne({
            title: 'Default',
            description: 'The Default Role.',
            deleted: null,
            admin: false,
            default: true
          }, function(err, response) {
            if (err) {
              return next(err);
            }

            callback();
          });
        }
        // Default role exists.
        else if (count === 1) {
          return callback();
        }
        else {
          console.log('Unknown count of the default role: ' + count);
          return callback();
        }
      });
    },
    function checkAdminRole(callback) {
      roleCollection.countDocuments({deleted: {$eq: null}, admin: true}, function(err, count) {
        if (err) {
          return callback(err);
        }

        // Insert the default role
        if (count === 0) {
          roleCollection.insertOne({
            title: 'Administrator',
            description: 'The Administrator Role.',
            deleted: null,
            admin: true,
            default: false
          }, function(err, response) {
            if (err) {
              return next(err);
            }

            callback();
          });
        }
        // Default role exists.
        else if (count === 1) {
          return callback();
        }
        else {
          console.log('Unknown count of the admin role: ' + count);
          return callback();
        }
      });
    }
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
