/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { classifyDatabase, STALE_AGE_MS } = require('./sweep-dbs');

// The sweeper's one dangerous mistake is dropping a database a running mocha process
// still needs, which corrupts that run instead of leaking a database. These pin the
// classification down; the drop itself is exercised by every solo run.
describe('sweep-dbs classifyDatabase', function () {
  const named = (pid, at = Date.now()) => `formio-ce-test-${pid}-${at.toString(36)}`;

  it('ignores the shared database the suite falls back to', function () {
    // No -<pid>-<base36> tail, so it can never be swept.
    assert.strictEqual(classifyDatabase('formio-ce-test'), null);
    assert.strictEqual(classifyDatabase('formio-ce'), null);
  });

  it('keeps a database whose process is still alive', function () {
    const verdict = classifyDatabase(named(process.pid));
    assert.strictEqual(verdict.stale, false);
  });

  it('drops a database whose process is gone', function () {
    // A pid above the platform maximum can never be running.
    const verdict = classifyDatabase(named(4194304));
    assert.strictEqual(verdict.stale, true);
  });

  it('drops a database older than the stale age even when the pid looks alive', function () {
    // Covers a recycled pid: this process is alive, but it cannot have created a
    // database named six hours ago.
    const at = Date.now() - STALE_AGE_MS - 1000;
    const verdict = classifyDatabase(named(process.pid, at));
    assert.strictEqual(verdict.stale, true);
  });
});
