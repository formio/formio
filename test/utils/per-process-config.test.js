/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { portForWorker, withMongoDb, perProcessDbName } = require('./per-process-config');

// Pure helpers behind the preload that hands every mocha process its own port and
// database. No app boot -- test/vm.test.js is the precedent for a wrapper that does
// not go through makeTestSuite.
describe('per-process-config', function () {
  describe('portForWorker', function () {
    it('leaves the base port alone when mocha is not running workers', function () {
      assert.strictEqual(portForWorker(3001, undefined), 3001);
    });

    it('leaves the base port alone for the first worker', function () {
      // mocha counts MOCHA_WORKER_ID from 0, so worker 0 keeps the serial port.
      assert.strictEqual(portForWorker(3001, '0'), 3001);
    });

    it('offsets the base port by the worker id', function () {
      assert.strictEqual(portForWorker(3001, '3'), 3004);
    });

    it('ignores a worker id that is not a number', function () {
      assert.strictEqual(portForWorker(3001, 'nope'), 3001);
    });
  });

  describe('withMongoDb', function () {
    it('replaces the database name', function () {
      assert.strictEqual(
        withMongoDb('mongodb://localhost:27017/formio-ce-test', 'formio-ce-test-1-a'),
        'mongodb://localhost:27017/formio-ce-test-1-a',
      );
    });

    it('appends a database name when the uri carries none', function () {
      assert.strictEqual(
        withMongoDb('mongodb://localhost:27017', 'formio-ce-test-1-a'),
        'mongodb://localhost:27017/formio-ce-test-1-a',
      );
    });

    it('preserves query options', function () {
      assert.strictEqual(
        withMongoDb('mongodb://localhost:27017/db?replicaSet=rs0', 'other'),
        'mongodb://localhost:27017/other?replicaSet=rs0',
      );
    });

    it('preserves a multi-host srv connection string', function () {
      assert.strictEqual(
        withMongoDb('mongodb+srv://a.example.com,b.example.com/db', 'other'),
        'mongodb+srv://a.example.com,b.example.com/other',
      );
    });
  });

  describe('perProcessDbName', function () {
    it('tags the base name with the pid and a base36 timestamp', function () {
      assert.strictEqual(
        perProcessDbName('formio-ce-test', 21375, 1755000000000),
        `formio-ce-test-21375-${(1755000000000).toString(36)}`,
      );
    });
  });
});

// The preload has load-time side effects on process.env, so it is exercised in a child
// process. What matters is not the env var itself but what `require('config')` resolves
// to afterwards: config/default.cjs hardcodes port 3001 and database formio-ce-test, and
// NODE_CONFIG is the only override that needs no change to the shipped config file.
describe('isolate-process', function () {
  const { execFileSync } = require('child_process');
  const path = require('path');

  // A clean slate per case, not process.env as it stands: test/tools/solo-run.js runs each
  // test with TEST_PORT_BASE set to its worker's port, and a case that reads the default
  // would otherwise assert against the harness's port instead of the config file's.
  const resolveConfig = (env) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          '-e',
          "require('./test/utils/isolate-process.js');" +
            "const c = require('config');" +
            'process.stdout.write(JSON.stringify({port: c.port, host: c.host, domain: c.domain, mongo: c.mongo}));',
        ],
        {
          cwd: path.join(__dirname, '..', '..'),
          env: {
            ...process.env,
            TEST_SUITE: '1',
            TEST_PORT_BASE: undefined,
            MOCHA_WORKER_ID: undefined,
            ...env,
          },
          encoding: 'utf8',
        },
      ),
    );

  it('gives the process its own database', function () {
    const config = resolveConfig({});
    assert.match(config.mongo, /\/formio-ce-test-\d+-[0-9a-z]+$/);
  });

  it('keeps the base port when mocha is not running workers', function () {
    assert.strictEqual(resolveConfig({}).port, 3001);
  });

  it('offsets port, host and domain for a mocha worker', function () {
    const config = resolveConfig({ MOCHA_WORKER_ID: '2' });
    assert.strictEqual(config.port, 3003);
    assert.strictEqual(config.host, 'localhost:3003');
    assert.strictEqual(config.domain, 'http://localhost:3003');
  });

  it('honours TEST_PORT_BASE so a busy port range can be moved', function () {
    assert.strictEqual(resolveConfig({ TEST_PORT_BASE: '4800', MOCHA_WORKER_ID: '1' }).port, 4801);
  });

  it('keeps the host from MONGO', function () {
    const config = resolveConfig({ MONGO: 'mongodb://127.0.0.1:27017/ignored' });
    assert.match(config.mongo, /^mongodb:\/\/127\.0\.0\.1:27017\/formio-ce-test-/);
  });
});
