'use strict';
const utils = require('../../util/util');
const ProgressBar = require('progress');

/**
 * Update 3.1.4
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
  submissions.countDocuments({deleted: {$eq: null}}, (err, count) => {
    const progress = new ProgressBar('Fixing IDs [:bar] :current/:total', { total: count });
    submissions.find({deleted: {$eq: null}}).batchSize(1000).each((err, submission) => {
      progress.tick();
      if (submission && submission.data && utils.ensureIds(submission.data)) {
        submissions.updateOne({_id: submission._id}, submission);
      }
    });
  });
};
