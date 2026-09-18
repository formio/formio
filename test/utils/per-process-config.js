'use strict';

// Pure helpers behind test/utils/isolate-process.js, which hands every mocha process
// its own port and database. Kept separate from the preload so they can be unit
// tested without the preload's load-time side effects.

// mocha stamps a worker with MOCHA_WORKER_ID, counting from 0 (see
// mocha/lib/nodejs/buffered-worker-pool.js). Serial runs have none, and worker 0 keeps
// the base port, so a serial run and the first worker of a parallel run agree.
const portForWorker = (base, workerId) => {
  const offset = Number(workerId);
  return base + (Number.isInteger(offset) ? offset : 0);
};

// Rewrites the database name in a connection string, preserving scheme, host list and
// query options (mongodb+srv, replica sets and auth options all survive). Mirrors
// apps/formio-server/test/utils/isolate-db.js's perProcessUri.
const withMongoDb = (uri, dbName) => {
  const [base, query] = uri.split('?');
  const schemeEnd = base.indexOf('://');
  const pathStart = base.indexOf('/', schemeEnd === -1 ? 0 : schemeEnd + 3);

  const hosts = pathStart === -1 ? base : base.slice(0, pathStart);

  return `${hosts}/${dbName}${query ? `?${query}` : ''}`;
};

// The pid alone is not enough: pids are recycled, and test/tools/sweep-dbs.js uses the
// timestamp to tell a database whose owner died from one a recycled pid still holds.
const perProcessDbName = (base, pid, now) => `${base}-${pid}-${now.toString(36)}`;

module.exports = { portForWorker, withMongoDb, perProcessDbName };
