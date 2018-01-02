'use strict';

const async = require('async');
const util = require('../util/util');

/**
 * Install script.
 *
 * This script should do the basic install process for formio. It should be modified to match whatever the most recent
 * update is expecting.
 */
module.exports = function(db, config, next) {
  util.log(' > Performing install.');

  async.parallel([
    function(cb) {
      // Create actions collections exist.
      db.createCollection('actions', null, function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.createIndexes([
          {
            key: {
              'form' : 1
            },
            name: 'form_1'
          }
        ], cb);
      });
    },
    function(cb) {
      // Create projects collections exist.
      db.createCollection('projects', null, function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.createIndexes([
          {
            key: {
              'name' : 1
            },
            name: 'name_1'
          },
          {
            key: {
              'access.id' : 1
            },
            name: 'access.id_1'
          },
          {
            key: {
              'owner' : 1
            },
            name: 'owner_1'
          }
        ], cb);
      });
    },
    function(cb) {
      // Create forms collections exist.
      db.createCollection('forms', null, function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.createIndexes([
          {
            key: {
              'name' : 1
            },
            name: 'name_1'
          },
          {
            key: {
              'project' : 1
            },
            name: 'project_1'
          },
          {
            key: {
              'version' : 1
            },
            name: 'version_1'
          },
          {
            key: {
              'path' : 1
            },
            name: 'path_1'
          },
          {
            key: {
              'type' : 1
            },
            name: 'type_1'
          },
          {
            key: {
              'access.id' : 1
            },
            name: 'access.id_1'
          },
          {
            key: {
              'owner' : 1
            },
            name: 'owner_1'
          }
        ], cb);
      });
    },
    function(cb) {
      // Create roles collections exist.
      db.createCollection('roles', null, function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.createIndexes([
          {
            key: {
              'project' : 1
            },
            name: 'project_1'
          }
        ], cb);
      });
    },
    function(cb) {
      // Create schema collections exist.
      db.createCollection('schema', null, function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.createIndexes([
          {
            key: {
              'key' : 1
            },
            name: 'key_1'
          }
        ], function(err, result) {
          if (err) {
            return cb(err);
          }

          collection.insertOne({key: 'formio', isLocked: false, version: config.schema}, cb);
        });
      });
    },
    function(cb) {
      // Create submissions collections exist.
      db.createCollection('submissions', null, function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.createIndexes([
          {
            key: {
              'form' : 1
            },
            name: 'form_1'
          },
          {
            key: {
              'access.id' : 1
            },
            name: 'access.id_1'
          },
          {
            key: {
              'owner' : 1
            },
            name: 'owner_1'
          },
          {
            key: {
              'roles' : 1
            },
            name: 'roles_1'
          }
        ], cb);
      });
    }
  ], next);
};
