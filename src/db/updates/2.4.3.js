'use strict';

let async = require('async');

/**
 * Update 2.4.3
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 *
 * Update all submissions to have owners
 */
module.exports = function(db, config, tools, done) {
  let submissions = db.collection('submissions');
  submissions.find({owner: {$eq: null}}).snapshot({$snapshot: true}).toArray(function(err, docs) {
    if (err) {
      return done(err);
    }
    if (!docs) {
      return done('No submissions found');
    }

    // Update each submission to be the owner of itself.
    async.forEachOf(docs, function(submission, key, next) {
      submissions.findOneAndUpdate(
        {_id: submission._id},
        {$set: {owner: submission._id}},
        {returnOriginal: false},
        function(err) {
          if (err) {
            return next(err);
          }

          next();
        }
      );
    }, function(err) {
      if (err) {
        return done(err);
      }

      done();
    });
  });
};
