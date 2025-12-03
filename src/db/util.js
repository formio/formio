'use strict';

/**
 * Sanitize database connection strings.
 * This regex matches:
 * 1. The protocol and optional +srv part: (mongodb(?:\+srv)?://)
 * 2. The username (assuming no ':' in username): ([^:]+)
 * 3. The optional password part: (:[^@]+)?
 * Followed by '@' that leads to host info.
 * After the match:
 * - p1: mongodb:// or mongodb+srv://
 * - p2: username
 * - p3: :password (if present)
 */
function sanitizeMongoConnectionString(connectionString) {
  return connectionString.replace(
    /(mongodb(?:\+srv)?:\/\/)([^:]+)(:[^@]+)?@/,
    (match, p1, p2, p3) => {
      // If a password is present, replace it with `***`
      if (p3) {
        return `${p1}${p2}:***@`;
      }
      // If no password is present (just username), leave it as is.
      return `${p1}${p2}@`;
    },
  );
}

const keyLength = 32;
const ivLength = 16;
const digest = "md5";
function deriveKeyAndIv(password) {
  const passwordBuffer = Buffer.from(password, "utf-8");
  let blocks = [];
  let currentHash = Buffer.alloc(0);
  let bytesGenerated = 0;

  while (bytesGenerated < keyLength + ivLength) {
    const hash = crypto.createHash(digest);
    hash.update(currentHash);
    hash.update(passwordBuffer);
    currentHash = hash.digest();
    blocks.push(currentHash);
    bytesGenerated += currentHash.length;
  }

  const derivedBytes = Buffer.concat(blocks, keyLength + ivLength);
  const key = derivedBytes.slice(0, keyLength);
  const iv = derivedBytes.slice(keyLength, keyLength + ivLength);
  return { key, iv };
}

module.exports = { sanitizeMongoConnectionString, deriveKeyAndIv };
