'use strict';

const { Writable } = require('stream');
// The one legitimate use: this is the transport that replays records through `debug`.
// eslint-disable-next-line formio/no-debug-package
const debug = require('debug');

// pino numeric level for `info`; anything at or above always reaches the legacy stream.
const INFO_LEVEL = 30;

// Record keys that are pino's own, or the request/response bindings pino-http attaches to
// every request-scoped line. Nothing else on a record was put there by anyone but the call
// site, so it is what the old `debug(object)` calls used to print.
const STANDARD_KEYS = new Set([
  'level',
  'time',
  'pid',
  'hostname',
  'name',
  'v',
  'msg',
  'module',
  'err',
  'req',
  'res',
  'reqId',
  'responseTime',
]);

// Decide whether a pino record should be written to the legacy `debug` stream.
// - info / warn / error / fatal always pass through (never lose visibility)
// - trace / debug only when the namespace matches the active DEBUG pattern
const shouldEmit = (level, namespace) => {
  if (level >= INFO_LEVEL) {
    return true;
  }
  return debug.enabled(namespace);
};

const extraFieldsOf = (record) => {
  const extras = {};
  for (const key of Object.keys(record)) {
    if (!STANDARD_KEYS.has(key)) {
      extras[key] = record[key];
    }
  }
  return extras;
};

const formatMessage = (record) => {
  const parts = [];
  if (record.msg) {
    parts.push(record.msg);
  }
  if (record.err) {
    const detail = record.err.stack || record.err.message;
    if (detail) {
      parts.push(detail);
    }
  }
  const extras = extraFieldsOf(record);
  if (Object.keys(extras).length) {
    parts.push(JSON.stringify(extras));
  }
  return parts.join(' ');
};

// Route a single parsed pino record to the `debug` namespace named by its `module` field.
const emit = (record) => {
  const namespace = record.module || 'formio';
  if (!shouldEmit(record.level, namespace)) {
    return;
  }
  const log = debug(namespace);
  // The emission decision is already made above; force `debug` to write even when the
  // namespace itself is not enabled (so warn/error/info are never dropped).
  log.enabled = true;
  log(formatMessage(record));
};

// In-process pino destination: parses each NDJSON line and replays it through `debug`.
const createLegacyDestination = () =>
  new Writable({
    write(chunk, encoding, callback) {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line) {
          continue;
        }
        let record;
        try {
          record = JSON.parse(line);
        } catch (ignore) {
          continue;
        }
        emit(record);
      }
      callback();
    },
  });

module.exports = { createLegacyDestination, shouldEmit, emit };
