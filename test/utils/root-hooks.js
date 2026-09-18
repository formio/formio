'use strict';

// Root hooks for the whole run, declared as a mocha root hook *plugin* rather than as
// bare before/after calls in a required file.
//
// That distinction is load-bearing under --parallel: a worker loads its --require
// modules exactly once (mocha/lib/nodejs/worker.js) but builds a NEW Mocha instance per
// spec file, so hooks registered at module scope attach to the worker's first file and
// then silently vanish for every file after it. Only plugin hooks are re-applied to each
// instance.
const { IS_NEXTGEN } = require('../util');

const beforeAll = [];
const afterAll = [];

// Previously registered at module scope in makeTestSuite.js, which every wrapper
// requires -- correct serially, invisible from the second file of a parallel worker on.
if (IS_NEXTGEN) {
  beforeAll.push(function () {
    const nock = require('nock');
    nock.disableNetConnect();
    nock.enableNetConnect((host) => /127\.0\.0\.1|localhost/.test(host));
  });
  afterAll.push(function () {
    require('nock').enableNetConnect();
  });
}

// test/utils/isolate-process.js points this process at its own database; drop it once
// the run finishes so repeated runs don't leave formio-ce-test-<pid> databases behind.
//
// Deliberately NOT registered in a parallel worker: there, afterAll fires once per spec
// FILE, and dropping the database takes the indexes mongoose only builds at boot with
// it -- every uniqueness assertion after that point would pass for the wrong reason.
// Parallel runs sweep instead (test/tools/sweep-dbs.js).
if (!process.env.MOCHA_WORKER_ID) {
  afterAll.push(async function () {
    this.timeout(30000);
    // Lazily: requiring initialize-app pulls in server.js and, through it, `config` --
    // which must not resolve before isolate-process.js has set NODE_CONFIG.
    await require('./initialize-app').dropDatabase();
  });
}

exports.mochaHooks = { beforeAll, afterAll };
