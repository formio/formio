'use strict';

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
module.exports = async function(db, config, tools) {
  try {
    /**
     * Example update 1.
     */
    const update1 = async () => {
      // db.collection.update();
    };

    /**
     * Example update 2.
     */
    const update2 = async () => {
      // db.collection.update();
    };

    /**
     * Example update 3.
     */
    const update3 = async () => {
      // db.collection.update();
    };

    // Run updates in sequence
    await update1();
    await update2();
    await update3();
  } catch (err) {
    console.error(err);
    throw err;
  }
};