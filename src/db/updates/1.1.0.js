'use strict';

let crypto = require('crypto');

/**
 * Encrypt some text
 * @param   {String} secret
 * @param   {Object} mixed
 * @returns {Buffer}
 */
function encrypt(secret, mixed) {
  if (mixed === undefined) {
    return undefined;
  }

  let cipher = crypto.createCipher('aes-256-cbc', secret);
  let decryptedJSON = JSON.stringify(mixed);

  return Buffer.concat([
    cipher.update(decryptedJSON),
    cipher.final()
  ]);
};

/**
 * Update 1.1.0
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = async function(db, config, tools) {
  try {
    // MongoDB Find all oldApps where user has unencrypted settings.
    const cursor = db.collection('applications').find({ settings: { $exists: true } });

    while (await cursor.hasNext()) {
      const application = await cursor.next();
      // Encrypt each Application's settings at rest.
      await db.collection('applications').updateOne(
        { _id: application._id },
        {
          $unset: { settings: 1 },
          $set: {
            settings_encrypted: encrypt(config.mongoSecret, application.settings),
          }
        }
      );
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
