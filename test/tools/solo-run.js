'use strict';

// Per-test independence harness for this package's suite.
//
// For each spec file it enumerates every test's full title with `mocha --dry-run`, then
// runs each test ALONE with an anchored `--grep`. A test that passes in the full file but
// fails on its own is depending on another test having run, or on a sibling suite's hooks
// — mocha runs a test's ancestor hooks, never a sibling's.
//
//   pnpm -F formio test:solo                             # every test/**/*.test.js
//   pnpm -F formio test:solo test/form.test.js           # just one file
//   pnpm -F formio test:solo -- --jobs 4                 # more parallelism (default 2)
//   pnpm -F formio test:solo test/form.test.js -- --grep 'Form Components'
//
// Note the wrapper, not the spec body: `test/form.js` declares no tests until
// `test/form.test.js` calls it through makeTestSuite, so mocha cannot enumerate it.
//
// Failures print the first `err.message` from mocha's JSON report, which turns "it fails"
// into "it got 400 not 401" — usually the whole diagnosis.
//
// Startup drops the per-process databases earlier killed runs leaked (see sweep-dbs.js);
// `--no-sweep` skips that.
//
// Exits non-zero if any test fails when run on its own, or if --grep matched nothing.

const { execFile, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { sweepStaleDatabases } = require('./sweep-dbs');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const MOCHA = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'mocha');
const REPORTS = fs.mkdtempSync(path.join(os.tmpdir(), 'solo-run-'));

const args = process.argv.slice(2);
let jobs = 2;
let basePort = 4600;
let filter = null;
let sweep = true;
const files = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--jobs') {
    jobs = Number(args[++i]);
  } else if (args[i] === '--base-port') {
    basePort = Number(args[++i]);
  } else if (args[i] === '--grep' || args[i] === '--filter') {
    filter = args[++i];
  } else if (args[i] === '--no-sweep') {
    sweep = false;
  } else if (args[i] === '--') {
    // pnpm forwards the separator itself when a positional argument precedes it; without
    // this it lands in `files` and mocha runs its default spec glob instead.
    continue;
  } else {
    files.push(args[i]);
  }
}

// Case-insensitive substring, deliberately not a regex: what it matches against is the
// title mocha just printed, so the point is to paste a describe name in without escaping
// it. The anchored regex each test is actually run with is built separately, in runAlone.
const matchesFilter = (fullTitle) =>
  !filter || fullTitle.toLowerCase().includes(filter.toLowerCase());

// Default to whatever `pnpm test` actually runs, so the two cannot drift. This package has
// no spec registry — discovery is the `test/**/*.test.js` glob in package.json. Walked by
// hand rather than with fs.globSync, which is still flagged experimental and prints a
// warning into output this harness parses.
const findWrappers = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return findWrappers(full);
      }
      return entry.name.endsWith('.test.js') ? [path.relative(PACKAGE_ROOT, full)] : [];
    })
    .sort();

if (!files.length) {
  files.push(...findWrappers(path.join(PACKAGE_ROOT, 'test')));
}

// Each worker gets its own port block. isolate-process.js reads TEST_PORT_BASE and hands
// the process both that port and a database named after its pid, so workers collide on
// neither. .mocharc.json supplies the preloads, so unlike formio-server's copy of this
// harness there is no hand-maintained `-r` list here to drift from the suite.
const envFor = (port) => ({
  ...process.env,
  TEST_SUITE: '1',
  TEST_PORT_BASE: String(port),
});

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const mochaArgs = (file, extra) => [
  '-t',
  '60000',
  '--no-node-snapshot',
  '--reporter',
  'json',
  ...extra,
  file,
  '--exit',
];

function enumerateTests(file) {
  // --dry-run reports the tests without executing them or their hooks.
  const report = path.join(REPORTS, 'enumerate.json');

  execFileSync(MOCHA, mochaArgs(file, ['--dry-run', '--reporter-options', `output=${report}`]), {
    cwd: PACKAGE_ROOT,
    env: envFor(basePort),
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'utf8',
  });

  return (JSON.parse(fs.readFileSync(report, 'utf8')).tests || [])
    .map((test) => test.fullTitle)
    .filter(Boolean);
}

let reportSeq = 0;

// Assertion messages are often multi-line diffs; one line each keeps the summary readable.
const oneLine = (message) => String(message).replace(/\s+/g, ' ').trim().slice(0, 300);

function runAlone(file, fullTitle, port) {
  // The report goes to a file, never stdout: these tests console.log objects, so stdout is
  // not parseable as JSON.
  const report = path.join(REPORTS, `run-${port}-${reportSeq++}.json`);

  return new Promise((resolve) => {
    execFile(
      MOCHA,
      mochaArgs(file, [
        '--reporter-options',
        `output=${report}`,
        '--grep',
        `^${escapeRe(fullTitle)}$`,
      ]),
      { cwd: PACKAGE_ROOT, env: envFor(port), maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' },
      () => {
        let stats = null;
        let error = null;
        try {
          const parsed = JSON.parse(fs.readFileSync(report, 'utf8'));
          stats = parsed.stats;
          // The assertion message is the diagnosis: "expected 401, got 400" says the test
          // is reading a fixture a predecessor built, where "it fails" says nothing.
          const failure = (parsed.failures || [])[0];
          error = failure && failure.err ? oneLine(failure.err.message) : null;
        } catch (_) {
          // no report written — the run crashed
        }
        try {
          fs.unlinkSync(report);
        } catch (_) {
          // best effort
        }

        // `passes >= 1` rather than `=== 1`: some files reuse a title within the same
        // suite path, so an anchored grep legitimately matches more than one test. A
        // pending test counts as ok too — it skipped itself, which says nothing about
        // independence.
        const ranSomething = !!stats && (stats.passes >= 1 || stats.pending >= 1);
        const ok = ranSomething && stats.failures === 0;
        const reason = stats
          ? `passes=${stats.passes} failures=${stats.failures} pending=${stats.pending}`
          : 'no report / crashed';

        resolve({ file, fullTitle, ok, reason, error });
      },
    );
  });
}

(async () => {
  // Self-heal the leak this harness causes: one killed solo run leaks one database per
  // test it had already spawned, and a few hundred of those degrade MongoDB enough to
  // look like a regression in the tests themselves.
  if (sweep) {
    await sweepStaleDatabases();
  }

  const queue = [];

  for (const file of files) {
    let enumerated = [];
    try {
      enumerated = enumerateTests(file);
    } catch (err) {
      console.log(`ENUMERATE-FAIL ${file}: ${String(err.message).slice(0, 200)}`);
      process.exitCode = 1;
      continue;
    }
    const titles = enumerated.filter(matchesFilter);
    console.log(
      `# ${path.basename(file)}: ${titles.length} tests` +
        (filter ? ` matching "${filter}" (of ${enumerated.length})` : ''),
    );
    titles.forEach((fullTitle) => queue.push({ file, fullTitle }));
  }

  // A typo'd filter must not read as a green run.
  if (filter && !queue.length) {
    console.log(`NO-MATCH  nothing matched --grep "${filter}"`);
    process.exitCode = 1;
    return;
  }

  const results = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: jobs }, (_, worker) =>
      (async () => {
        while (next < queue.length) {
          const job = queue[next++];
          const result = await runAlone(job.file, job.fullTitle, basePort + worker);
          results.push(result);
          if (!result.ok) {
            console.log(`FAIL  [${path.basename(result.file)}] ${result.fullTitle}`);
          }
        }
      })(),
    ),
  );

  // Re-check failures one at a time. Running several suites at once is enough to make
  // some tests flake, so a parallel failure is not proof of a dependency — only a test
  // that also fails alone on an otherwise idle machine counts.
  const suspects = results.filter((result) => !result.ok);

  if (suspects.length) {
    console.log(`\n# re-checking ${suspects.length} failure(s) one at a time...`);
    for (const suspect of suspects) {
      const retry = await runAlone(suspect.file, suspect.fullTitle, basePort);
      suspect.ok = retry.ok;
      suspect.reason = retry.reason;
      suspect.error = retry.error;
      console.log(
        `${retry.ok ? 'FLAKE' : 'REAL '} [${path.basename(suspect.file)}] ${suspect.fullTitle}` +
          (retry.ok ? '' : `  (${retry.reason})`),
      );
      if (!retry.ok && retry.error) {
        console.log(`      ${retry.error}`);
      }
    }
  }

  const byFile = new Map();
  results.forEach((result) => {
    const name = path.basename(result.file);
    if (!byFile.has(name)) {
      byFile.set(name, { pass: 0, fail: 0 });
    }
    byFile.get(name)[result.ok ? 'pass' : 'fail']++;
  });

  console.log('\n=== SOLO-RUN SUMMARY (each test run on its own) ===');
  for (const [name, counts] of byFile) {
    console.log(`${name.padEnd(28)} pass=${String(counts.pass).padEnd(4)} fail=${counts.fail}`);
  }

  const failing = results.filter((result) => !result.ok);
  console.log(`TOTAL failing-alone: ${failing.length} / ${results.length}`);

  if (failing.length) {
    console.log('\n--- first error per failing test ---');
    failing.forEach((result) => {
      console.log(`[${path.basename(result.file)}] ${result.fullTitle}`);
      console.log(`    ${result.error || result.reason}`);
    });
    process.exitCode = 1;
  }
})();
