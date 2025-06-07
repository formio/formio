'use strict';

/**
 * Update 3.1.1
 *
 * Run this using "node ./src/db/manual/3.1.1
 *
 * @param db
 * @param config
 * @param tools
 */
const util = require('../../util/util');
const config = require('config');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

(async () => {
  try {
    const client = await MongoClient.connect(config.mongo);
    const db = client.db(client.s.options.dbName);
    const formCollection = db.collection('forms');
    const submissionCollection = db.collection('submissions');
    const setDateField = (field, data) => {
      if (!data) {
        return false;
      }
      const parts = field.split('.');
      const value = data[parts[0]];
      // Handle Datagrids
      if (Array.isArray(value)) {
        return value.reduce((changed, row) => {
          return setDateField(parts.slice(1).join('.'), row) || changed;
        }, false);
      }
      // Handle Containers
      if (parts.length > 1) {
        return setDateField(parts.slice(1).join('.'), value);
      }
      if (value && !(value instanceof Date)) {
        data[parts[0]] = new Date(value);
        return true;
      }
      else {
        return false;
      }
    };

    const formCursor = formCollection.find({deleted: {$eq: null}});
    while (await formCursor.hasNext()) {
      const form = await formCursor.next();
      if (!form) {
        break;
      }
      const fields = [];
      util.FormioUtils.eachComponent(
        form.components,
        (component, path) => {
          // We only care about non-layout components, which are not unique, and have not been blacklisted.
          if (component.type === 'datetime') {
            fields.push(path);
          }
        }, true);

      if (!fields.length) {
        continue;
      }

      const submissionCursor = submissionCollection.find({
        form: form._id,
        deleted: {$eq: null}
      });

      while (await submissionCursor.hasNext()) {
        const submission = await submissionCursor.next();
        if (!submission) {
          break;
        }
        const changed = fields.reduce((changed, field) => {
          return setDateField(field, submission.data) || changed;
        }, false);
        if (changed) {
          /* eslint-disable no-console */
          console.log(`Updating date fields for submission: ${submission._id}`);
          /* eslint-disable no-console */
          await submissionCollection.updateOne(
            {
               _id: submission._id
               },
            {
               $set: {
                 data: submission.data
                }
            },
            {
              upsert: false
            });
        }
      }
    }
    /* eslint-disable no-console */
    console.log('Done');
     /* eslint-disable no-console */
  }
 catch (err) {
    /* eslint-disable no-console */
    return console.log(`Could not connect to database ${config.mongo}`);
    /* eslint-disable no-console */
  }
})();
