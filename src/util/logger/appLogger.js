'use strict';

const pino = require('pino');
const { FEATURE_FLAGS, isFeatureEnabled } = require('@formio/feature-flags');
const { createLegacyDestination } = require('./legacyDestination');
const { REDACT_PATHS, REDACTION_CENSOR, serializeError } = require('./redaction');

// The environment values that turn a flag on; any other non-empty value means off.
const TRUTHY_ENV_VALUES = ['true', '1'];

// GOTCHA(G-FOS05)
// `getConfig` contract for the feature-flag resolver: return `null` when the variable is
// unset so the flag falls back to its registry `defaultValue`, otherwise a real boolean.
const readFlagFromEnv = (flag) => {
  const value = process.env[flag.envVar];
  const isUnset = value === undefined || value === '';
  if (isUnset) {
    return null;
  }
  // Lowercased to match formio-server's `parseBoolean`, which resolves this same env var
  // for `config.featureFlags`; the two must not disagree within one process.
  return TRUTHY_ENV_VALUES.includes(value.toLowerCase());
};

// Release gate for FIO-7988. While this is off, the server keeps the pre-migration
// `debug`-style output; nothing an operator sets can opt into the structured format.
// Resolved straight from the environment because the logger is built at module load,
// long before `config` (and therefore `hook.alter('isFeatureEnabled', ...)`) exists.
const isStructuredLoggingEnabled = () =>
  isFeatureEnabled(FEATURE_FLAGS.STRUCTURED_LOGGING, readFlagFromEnv);

// Resolve the output mode, in priority order:
//   1. legacy whenever the STRUCTURED_LOGGING flag is off (the release gate)
//   2. FORMIO_LOG_FORMAT (json | legacy) when explicitly set
//   3. legacy when DEBUG is present (zero-config compatibility for old monitoring)
//   4. json (the default structured output)
const resolveLogMode = () => {
  if (!isStructuredLoggingEnabled()) {
    return 'legacy';
  }
  const format = process.env.FORMIO_LOG_FORMAT;
  if (format === 'json' || format === 'legacy') {
    return format;
  }
  if (process.env.DEBUG) {
    return 'legacy';
  }
  return 'json';
};

// Shared by both modes: what never reaches a record does not depend on the output format.
const redact = { paths: REDACT_PATHS, censor: REDACTION_CENSOR };
const serializers = { err: serializeError };

const getLoggerOptions = () => {
  const options = {
    level: process.env.LOG_LEVEL || 'info',
    redact,
    serializers,
  };
  // Only if the program is running in an interactive terminal
  if (process.stdout.isTTY) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    };
  }
  return options;
};

// The legacy destination applies the DEBUG namespace filtering itself, so trace/debug
// records only need to reach it when a DEBUG pattern exists to match them against. Without
// one, pino drops them at the call site instead of serializing them for nothing.
const getLegacyLoggerOptions = () => ({
  level: process.env.DEBUG ? 'trace' : 'info',
  redact,
  serializers,
});

const createLogger = () => {
  if (resolveLogMode() === 'legacy') {
    return pino(getLegacyLoggerOptions(), createLegacyDestination());
  }
  return pino(getLoggerOptions());
};

const logger = createLogger();

module.exports = logger;
module.exports.resolveLogMode = resolveLogMode;
module.exports.isStructuredLoggingEnabled = isStructuredLoggingEnabled;
module.exports.getLoggerOptions = getLoggerOptions;
module.exports.getLegacyLoggerOptions = getLegacyLoggerOptions;
