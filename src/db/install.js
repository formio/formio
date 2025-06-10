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
    async function() {
      // Create actions collections exist.
      const collection = await db.createCollection('actions', null);
      await collection.createIndexes([
        {
          key: {
            'form' : 1
          },
          name: 'form_1'
        },
        {
          key: {
            'priority': 1,
            'title': 1
          },
          name: 'priority_1_title_1'
        }
      ]);
    },
    async function() {
      // Create projects collections exist.
      const collection = await db.createCollection('projects', null);
      await collection.createIndexes([
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
      ]);
    },
    async function() {
      // Create forms collections exist.
      const collection = await db.createCollection('forms', null);
      await collection.createIndexes([
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
        ]);
    },
    async function() {
      // Create roles collections exist.
      const collection = await db.createCollection('roles', null);
      await collection.createIndexes([
          {
            key: {
              'project' : 1
            },
            name: 'project_1'
          }
        ]);
    },
    async function() {
      // Create schema collections exist.
      const collection = await db.createCollection('schema', null);
      await collection.createIndexes([
          {
            key: {
              'key' : 1
            },
            name: 'key_1'
          }
        ]);
        await collection.insertOne({key: 'formio', isLocked: false, version: config.schema});
    },
    async function() {
      // Create submissions collections exist.
      const collection = await db.createCollection('submissions', null);
      await collection.createIndexes([
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
        ]);
    }
  ], next);
};
