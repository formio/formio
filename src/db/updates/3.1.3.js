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
 * @param done
 */
module.exports = function(db, config, tools, done) {
  done();
  const submissions = db.collection('submissions');
  const forms = db.collection('forms');
  forms.countDocuments({deleted: {$eq: null}}, (err, count) => {
    const progress = new ProgressBar('[:bar] :current/:total', { total: count });
    forms.find({deleted: {$eq: null}}).forEach((form) => {
      utils.eachComponent(form.components, function(component, path) {
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
      }, true);
      progress.tick();
    });
  });
};
