'use strict';

const crypto = require('crypto');
const util = require('../util/util');

module.exports = function(db, schema) {
  return {
    /**
     * Include the formio utils.
     */
    util: util,

    /**
     * Update the version store in the schema lock, using the provided schema and the mongo native driver.
     *
     * @param version
     * @returns {Function}
     */
    updateLockVersion(version, callback) {
      schema.updateOne(
        {key: 'formio'},
        {$set: {version: version}},
        (err) => {
          if (err) {
            throw err;
          }

          util.log(` > Upgrading MongoDB Schema lock to v${version}`);
          callback();
        }
      );
    },
    /**
     * Encrypt some text
     * @param   {String} secret
     * @param   {Object} mixed
     * @returns {Buffer}
     */
    encrypt(secret, mixed) {
      if (mixed === undefined) {
        return undefined;
      }

      const cipher = crypto.createCipheriv('aes-256-cbc', secret, Buffer.alloc(16, 0));
      const decryptedJSON = JSON.stringify(mixed);

      return Buffer.concat([
        cipher.update(decryptedJSON),
        cipher.final()
      ]);
    },
    decrypt(secret, cipherbuffer) {
      if (cipherbuffer === undefined) {
        return undefined;
      }

      const decipher = crypto.createDecipheriv('aes-256-cbc', secret, Buffer.alloc(16, 0));
      const decryptedJSON = Buffer.concat([
        decipher.update(cipherbuffer), // Buffer contains encrypted utf8
        decipher.final()
      ]);

      return JSON.parse(decryptedJSON);  // This can throw a exception
    }
  };
};
