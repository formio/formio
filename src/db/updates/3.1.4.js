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
module.exports = async function(db, config, tools, done) {
  done();
  const submissions = db.collection('submissions');
  const count = await submissions.countDocuments({ deleted: { $eq: null } });
  const progress = new ProgressBar('Fixing IDs [:bar] :current/:total', { total: count });
  await submissions.find({ deleted: { $eq: null } }).batchSize(1000).forEach(async (submission) => {
    progress.tick();
    if (submission && submission.data && utils.ensureIds(submission.data)) {
      await submissions.updateOne({ _id: submission._id }, { $set: submission });
    }
  });
};
