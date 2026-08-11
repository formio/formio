'use strict';

const crypto = require('crypto');

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

const REDACTED_VALUE = '***';
const SENSITIVE_CONFIG_KEYS = new Set([
  'mongoConfig',
  'mongoSSL',
  'mongoSSLPassword',
  'mongoSA',
  'mongoCA',
  'mongoSecret',
  'mongoSecretOld',
  'sslKey',
  'sslCert',
  'licenseKey',
  'pdfProjectApiKey',
  'esignPrivateKeyPath',
  'clientSecret',
  'remoteSecret',
  'userAPIKey',
  'api_key',
]);
const SENSITIVE_CONFIG_KEY_PATTERNS = [
  /secret/i,
  /password/i,
  /passphrase/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
];

function isSensitiveConfigKey(key) {
  return SENSITIVE_CONFIG_KEYS.has(key) ||
    SENSITIVE_CONFIG_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactMongoValue(value) {
  if (typeof value === 'string') {
    return sanitizeMongoConnectionString(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactMongoValue);
  }

  return redactConfig(value);
}

function redactConfig(value, key = '') {
  if (isSensitiveConfigKey(key)) {
    return REDACTED_VALUE;
  }

  if (key === 'mongo') {
    return redactMongoValue(value);
  }

  if (typeof value === 'string' && /^mongodb(?:\+srv)?:\/\//.test(value)) {
    return sanitizeMongoConnectionString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactConfig(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value).reduce((redacted, childKey) => {
    redacted[childKey] = redactConfig(value[childKey], childKey);
    return redacted;
  }, {});
}

const keyLength = 32;
const ivLength = 16;
const digest = 'md5';
function deriveKeyAndIv(password) {
  const passwordBuffer = Buffer.from(password, 'utf-8');
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

module.exports = { sanitizeMongoConnectionString, redactConfig, deriveKeyAndIv };
