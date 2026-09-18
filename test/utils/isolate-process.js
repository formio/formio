'use strict';

// Gives every mocha process its own port and its own database, so two runs of this
// suite cannot wipe each other and the suite can be run in parallel: `mocha --parallel`
// forks a worker per spec file, and test/tools/solo-run.js forks one per test.
//
// config/default.cjs hardcodes `port` and, under TEST_SUITE, the `formio-ce-test`
// database; it reads no PORT and honours MONGO only for the host. So the override comes
// through NODE_CONFIG, which the `config` package merges over the file -- no change to
// the shipped config. It has to be set before anything requires `config` (server.js:49),
// which is why this is a mocha `--require` in .mocharc.json rather than something a spec
// pulls in: the preloads load ahead of every spec file.
const { portForWorker, withMongoDb, perProcessDbName } = require('./per-process-config');

// The config file, not the `config` package: requiring the package here would resolve
// and freeze it against the very defaults we are about to override.
const defaults = require('../../config/default.cjs');

// `mongoBase` in default.cjs already folds in MONGO, so the host comes along for free
// and the database name stays the file's to decide.
const testDb = defaults.mongo.split('?')[0].split('/').pop();

const port = portForWorker(
  Number(process.env.TEST_PORT_BASE || defaults.port),
  process.env.MOCHA_WORKER_ID,
);
const mongo = withMongoDb(defaults.mongo, perProcessDbName(testDb, process.pid, Date.now()));

// Merge rather than assign: a caller may have set NODE_CONFIG for its own reasons.
const overrides = process.env.NODE_CONFIG ? JSON.parse(process.env.NODE_CONFIG) : {};

process.env.NODE_CONFIG = JSON.stringify({
  ...overrides,
  port,
  // host and domain must follow the port: they are what the suite builds absolute URLs
  // from, and a mismatch points a request at another worker's server.
  host: `localhost:${port}`,
  domain: `http://localhost:${port}`,
  mongo,
});

module.exports = { port, mongo };
