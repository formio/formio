'use strict';

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
 */
module.exports = function(db, config, tools) {
  let roleCollection = db.collection('roles');

  const checkDefaultRole = () => {
    return roleCollection.countDocuments({ deleted: { $eq: null }, default: true })
      .then(count => {
        if (count === 0) {
          // Insert the default role
          return roleCollection.insertOne({
            title: 'Default',
            description: 'The Default Role.',
            deleted: null,
            admin: false,
            default: true
          });
        } else if (count === 1) {
          // Default role already exists
          return Promise.resolve();
        } else {
          console.log('Unknown count of the default role: ' + count);
          return Promise.resolve();
        }
      });
  };

  const checkAdminRole = () => {
    return roleCollection.countDocuments({ deleted: { $eq: null }, admin: true })
      .then(count => {
        if (count === 0) {
          // Insert the admin role
          return roleCollection.insertOne({
            title: 'Administrator',
            description: 'The Administrator Role.',
            deleted: null,
            admin: true,
            default: false
          });
        } else if (count === 1) {
          // Admin role already exists
          return Promise.resolve();
        }
        else {
          console.log('Unknown count of the admin role: ' + count);
          return Promise.resolve();
        }
      });
  };

  checkDefaultRole()
    .then(() => checkAdminRole());
};
