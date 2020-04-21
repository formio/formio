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
 * Decrypt some text
 *
 * @param   {String} secret
 * @param   {Buffer} cipherbuffer
 * @returns {Object}
 */
function decrypt(secret, cipherbuffer) {
  if (cipherbuffer === undefined) {
    return undefined;
  }

  let decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decryptedJSON = Buffer.concat([
    decipher.update(cipherbuffer), // Buffer contains encrypted utf8
    decipher.final()
  ]);

  return JSON.parse(decryptedJSON);  // This can throw a exception
};

/**
 * Update 2.1.0
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  // Add cors settings to existing projects.
  let projects = db.collection('projects');
  projects.find({}).snapshot({$snapshot: true}).forEach(function(project) {
    let settings = {
      cors: '*'
    }
    if (project.settings_encrypted) {
      settings = decrypt(config.mongoSecret, project.settings_encrypted.buffer);
      settings.cors = '*';
    }
    projects.updateOne(
      { _id: project._id },
      {
        $set: {
          settings_encrypted: encrypt(config.mongoSecret, settings),
        }
      }
    )
  },
  done);
};
