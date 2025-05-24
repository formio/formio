'use strict';

/**
 * Update 2.4.3
 *
 * @param db
 * @param config
 * @param tools
 *
 * Update all submissions to have owners
 */
module.exports = function(db, config, tools) {
  let submissions = db.collection('submissions');
  submissions.find({owner: {$eq: null}}).toArray()
  .then(docs => {
    if (!docs) {
      throw ('No submissions found');
    }
       // Update each submission to be the owner of itself.
      const updatePromises = docs.map((submission) => {
        return submissions.updateOne(
          { _id: submission._id },
          { $set: { owner: submission._id } }
        );
      });

      return Promise.all(updatePromises);
    });
};
