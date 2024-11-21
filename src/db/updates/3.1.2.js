'use strict';
const _ = require('lodash');
const ObjectID = require('mongodb').ObjectId;
const util = require('../../util/util');
const { resolve } = require('q');

/**
 * Update 3.1.2
 *
 * This update converts all save-as-reference's to ObjectIds
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = async function(db, config, tools) {
  const runInBackground = async () => {
    const submissions = db.collection('submissions');
    await db.collection('forms').find({deleted: {$eq: null}}).forEach(async (form) => {
      await new Promise((resolve, reject) => {
        util.FormioUtils.eachComponent(form.components, function(component, path) {
          if (component.reference) {
            submissions.find({form: form._id, deleted: {$eq: null}}).forEach((submission) => {
              const refId = _.get(submission, `data.${path}._id`);
              if (refId) {
                const update = {};
                update[`data.${path}._id`] = new ObjectID(refId);
                submissions.updateOne({_id: submission._id}, {$set: update});
              }
            });
          }
          return resolve();
        }, true);
      });
    });
  }
  runInBackground();
};
