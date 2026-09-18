'use strict';

// Drops the per-process test databases a killed or crashed mocha run left behind.
//
// test/utils/isolate-process.js gives every mocha process its own database — the name in
// config/default.cjs plus `-<pid>-<base36 Date.now()>` — and test/utils/root-hooks.js
// drops it in a root afterAll. Any kill, timeout or crash skips that hook; so does a
// parallel run, where the drop is deliberately not registered. A solo run spawns one
// process per test, so an interrupted sweep of a large file leaks hundreds of databases.
// A degraded MongoDB does not fail whole-file runs — it shows up as a wave of per-test
// failures that reads as a regression and is not one.
//
//   node test/tools/sweep-dbs.js             # drop the stale databases
//   node test/tools/sweep-dbs.js --dry-run   # list them without dropping
//
// SAFETY: several mocha processes are usually running (other agents, other terminals, the
// solo harness itself) and each needs its database for the length of its run. Dropping a
// live process's database corrupts its results rather than leaking one, so a database is
// stale only when its pid is **gone** — or, to cover a recycled pid, when the timestamp in
// its own name is older than STALE_AGE_MS.
const { MongoClient } = require('mongodb');

// The pure helpers, never isolate-process.js: requiring the preload would set NODE_CONFIG
// for this process, and every mocha child solo-run.js spawns would inherit it and be
// pinned to the sweeper's port and database.
const { perProcessDbName } = require('../utils/per-process-config');
const defaults = require('../../config/default.cjs');

// A recycled pid looks alive, so fall back to the timestamp in the name. Nothing in this
// suite runs for six hours.
const STALE_AGE_MS = 6 * 60 * 60 * 1000;

const baseUri = defaults.mongo;
const baseName = baseUri.split('?')[0].split('/').pop();

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Derived from perProcessDbName rather than hand-written, and asserted so a change to the
// naming breaks here loudly instead of silently matching nothing. INDEPENDENCE.md's
// "Get the name right": a pattern that matches nothing prints "dropped 0" against a Mongo
// holding hundreds of leaked databases, and the contention then reads as a regression.
if (perProcessDbName(baseName, 1, 0) !== `${baseName}-1-0`) {
  throw new Error('perProcessDbName no longer names databases <base>-<pid>-<base36>');
}

// The `-<pid>-<base36>` tail is what makes the sweep safe: the shared formio-ce-test and
// formio-ce databases carry no tail and can never match.
const PATTERN = new RegExp(`^${escapeRe(baseName)}-(\\d+)-([0-9a-z]+)$`);

const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to another user — still alive.
    return err.code === 'EPERM';
  }
};

// { stale, reason } for a per-process database, or null when the name is not one.
const classifyDatabase = (name, now = Date.now()) => {
  const match = PATTERN.exec(name);
  if (!match) {
    return null;
  }

  const pid = Number(match[1]);
  const ageMs = now - parseInt(match[2], 36);

  if (!isAlive(pid)) {
    return { stale: true, reason: `pid ${pid} gone` };
  }
  if (ageMs > STALE_AGE_MS) {
    return {
      stale: true,
      reason: `pid ${pid} alive but the name is ${Math.round(ageMs / 3.6e6)}h old`,
    };
  }
  return { stale: false, reason: `pid ${pid} alive` };
};

async function sweepStaleDatabases({ dryRun = false, log = console.log } = {}) {
  const client = new MongoClient(baseUri, { serverSelectionTimeoutMS: 5000 });
  const dropped = [];
  const kept = [];

  try {
    await client.connect();
    const { databases } = await client.db('admin').admin().listDatabases({ nameOnly: true });

    for (const { name } of databases) {
      const verdict = classifyDatabase(name);
      if (!verdict) {
        continue;
      }
      if (!verdict.stale) {
        kept.push(name);
        continue;
      }
      if (!dryRun) {
        await client.db(name).dropDatabase();
      }
      dropped.push(name);
    }
  } catch (err) {
    // Housekeeping: never let the sweep stop the run it is cleaning up for.
    log(`# db sweep skipped: ${err.message}`);
    return { dropped, kept, skipped: true };
  } finally {
    await client.close();
  }

  if (dropped.length || kept.length) {
    log(
      `# db sweep: ${dryRun ? 'would drop' : 'dropped'} ${dropped.length} stale, ` +
        `kept ${kept.length} belonging to live processes`,
    );
  }

  return { dropped, kept, skipped: false };
}

if (require.main === module) {
  const dryRun = process.argv.slice(2).includes('--dry-run');

  sweepStaleDatabases({ dryRun }).then(({ dropped, kept }) => {
    dropped.forEach((name) => console.log(`${dryRun ? 'would drop' : 'dropped'} ${name}`));
    kept.forEach((name) => console.log(`kept      ${name} (${classifyDatabase(name).reason})`));
  });
}

module.exports = { sweepStaleDatabases, classifyDatabase, PATTERN, STALE_AGE_MS };
