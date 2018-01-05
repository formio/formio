'use strict';

let async = require('async');

/**
 * Update 1.0.0
 *
 * This is an example of how to write an update script.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  /**
   * Example update 1.
   */
  let update1 = function(callback) {
    // db.collection.update();
    callback();
  };

  /**
   * Example update 2.
   */
  let update2 = function(callback) {
    // db.collection.update();
    callback();
  };

  /**
   * Example update 3.
   */
  let update3 = function(callback) {
    // db.collection.update();
    callback();
  };

  async.series([
      update1,
      update2,
      update3
    ],
    function(err) {
      if (err) {
        return done(err);
      }

      done();
    });
};
