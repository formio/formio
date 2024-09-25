'use strict';

const util = require('../util/util');

/**
 * Install script.
 *
 * This script should do the basic install process for formio. It should be modified to match whatever the most recent
 * update is expecting.
 */
module.exports = async function(db, config, next) {
  util.log(' > Performing install.');

    async function createActionsCollection() {
      // Create actions collections exist.
      const collection = await db.createCollection('actions', null);
      await collection.createIndexes([
        {
          key: {
            'form' : 1
          },
          name: 'form_1'
        }
      ]);
    }
    async function createProjectsCollection() {
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
    }
    async function createFormsCollection() {
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
    }
    async function createRolesCollection() {
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
    }
    async function createSchemaCollection() {
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
    }
    async function createSubmissionsCollection() {
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

    try {
      await Promise.all([
        createActionsCollection(),
        createProjectsCollection(),
        createFormsCollection(),
        createRolesCollection(),
        createSchemaCollection(),
        createSubmissionsCollection()
      ]);
      return next();
    }
    catch (err) {
      return next(err);
    }
};
