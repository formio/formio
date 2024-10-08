'use strict';

let async = require('async');

/**
 * Update 2.3.1
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 *
 * Update the projects name index.
 */
module.exports = function(db, config, tools, done) {
  let projects = db.collection('projects');

  let dropOldIndex = function(name, cb) {
    // Ignore errors for non-existing index on drop, because we dont care about it.
    projects.dropIndex(name)
    .then(() => cb());
  };

  let addNewNameIndex = function(cb) {
    projects.createIndex({name: 1}, {background: true})
    .then(() => cb())
    .catch(err => cb(err));
  };

  async.series([
    async.apply(dropOldIndex, 'name_1'),
    async.apply(dropOldIndex, 'name_1_1'),
    addNewNameIndex
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
