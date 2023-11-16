'use strict';

const crypto = require('crypto');

module.exports = (secret, cipherbuffer) => {
  if (!secret || !cipherbuffer) {
    return null;
  }
  let data = {};

  try {
    const defaultSaltLength = 40;
    const buffer = Buffer.isBuffer(cipherbuffer) ? cipherbuffer : cipherbuffer.buffer;
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    const decryptedJSON = Buffer.concat([
      decipher.update(buffer), // Buffer contains encrypted utf8
      decipher.final()
    ]);
    data = JSON.parse(decryptedJSON.slice(0, -defaultSaltLength));
  }
  catch (e) {
    data = null;
  }

  return data;
};
