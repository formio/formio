'use strict';
const utils = require('../../util/util');
const _ = require('lodash');
const ObjectID = require('mongodb').ObjectId;
const ProgressBar = require('progress');

/**
 * Update 3.1.3
 *
 * This update converts all resource, select, and nested form components data to ObjectId.
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function(db, config, tools) {
  const runInBackground = async () => {
    const submissions = db.collection('submissions');
    const forms = db.collection('forms');
    const count = await forms.countDocuments({deleted: {$eq: null}});
    const progress = new ProgressBar('[:bar] :current/:total', { total: count });
    const formsCursor = forms.find({deleted: {$eq: null}});

    for await (const form of formsCursor) {
      // Iterate over components to check for references
      await new Promise((resolve, reject) => {
        utils.eachComponent(
          form.components,
          async (component, path) => {
            if (component.reference) {
              try {
                const submissionsCursor = submissions.find({
                  form: form._id,
                  deleted: { $eq: null },
                });

                for await (const submission of submissionsCursor) {
                  const refId = _.get(submission, `data.${path}._id`);
                  if (refId) {
                    const update = {};
                    update[`data.${path}._id`] = new ObjectID(refId);
                    await submissions.updateOne(
                      { _id: submission._id },
                      { $set: update }
                    );
                  }
                }
              }
              catch (error) {
                return reject(error);
              }
            }
          },
          true
        );
        resolve();
      });

      progress.tick();
    }

  };

  runInBackground();
};
