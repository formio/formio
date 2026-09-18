# `test/tools` — per-test independence harness

Two tools for the suite `pnpm -F formio test` runs (`test/**/*.test.js`):

- **`solo-run.js`** — runs each test **alone**, in its own mocha process, to find the ones
  that only pass because something else ran first.
- **`sweep-dbs.js`** — drops the per-process databases a killed run leaked.

A test is independent when running it on its own passes _for the reason it claims to_.
Mocha runs a test's **ancestor** hooks but never a **sibling suite's** hooks and never a
preceding **sibling test** — so shared setup in `before`/`beforeEach` is fine, and what
breaks isolation is a test that depends on _another test_ having run.

## Run it

```sh
pnpm -F formio test:solo                                   # every test/**/*.test.js
pnpm -F formio test:solo test/form.test.js                 # one file
pnpm -F formio test:solo -- --jobs 4                       # more parallelism (default 2)
pnpm -F formio test:solo -- --base-port 4810               # move the port block (default 4600)
pnpm -F formio test:solo test/form.test.js -- --grep 'Form Components'
pnpm -F formio test:solo -- --no-sweep                     # skip the leaked-database sweep
```

Point it at the **wrapper**, not the spec body: `test/form.js` declares no tests until
`test/form.test.js` calls it through `makeTestSuite`, so mocha cannot enumerate it.

A full pass over a large file takes tens of minutes, which is too slow to iterate against.
`--grep` (alias `--filter`) is a **case-insensitive substring** of the full title — a
describe name pastes in without escaping — so converting one describe and re-measuring only
that describe drops the loop to seconds. A `--grep` that matches nothing exits non-zero with
`NO-MATCH`, so a typo cannot read as a green run.

Every failure prints the first `err.message` from mocha's JSON report, which is usually the
whole diagnosis: `reading 'form'` on a null handle means the test reads a fixture a
predecessor built; `expected 401, got 400` means it is authenticating as somebody a
predecessor logged in.

## How a result is decided

1. `mocha --dry-run` enumerates every test's full title without running it or its hooks.
2. Each title is run alone with an anchored `--grep`, `jobs` at a time.
3. Every parallel failure is **re-run serially** and relabelled `FLAKE` or `REAL`. Running
   several suites at once is enough to make some tests flake, so a parallel failure is not
   proof of a dependency.

A test counts as ok on `failures === 0` and at least one pass or pending. Pending means the
test skipped itself, which says nothing about independence.

Unlike a hand-maintained `-r` list, the preloads come from `.mocharc.json`, so what
`solo-run.js` runs cannot drift from what `pnpm test` runs.

## Isolation, and the leak it causes

`test/utils/isolate-process.js` gives every mocha process its own port and its own database
— the name in `config/default.cjs` plus `-<pid>-<base36 Date.now()>`, e.g.
`formio-ce-test-21375-mst71ald` — and `test/utils/root-hooks.js` drops it in a root
`afterAll`. Any kill, timeout or crash skips that hook, and a solo run spawns **one process
per test**, so one interrupted sweep of a big file leaks hundreds of databases.

A degraded MongoDB does **not** fail whole-file runs. It shows up as a wave of per-test
failures that reads as a regression and is not one — so sweep before believing a bad
measurement. `solo-run.js` sweeps at startup, and by hand:

```sh
node test/tools/sweep-dbs.js --dry-run   # list what would go, and why
node test/tools/sweep-dbs.js             # drop them
```

A database is dropped only when its pid is **gone** (`process.kill(pid, 0)`, treating
`EPERM` as alive), or — to cover a recycled pid — when the timestamp in its own name is more
than six hours old. Other people's mocha processes are usually running, and dropping a live
process's database corrupts that run's results instead of leaking one database. The match
pattern is derived from `perProcessDbName` rather than hand-written, and always requires the
`-<pid>-<base36>` tail, so the shared `formio-ce-test` / `formio-ce` databases can never
match.

## Running the suite in parallel

```sh
pnpm -F formio test:isolated              # MOCHA_JOBS=4 by default
MOCHA_JOBS=8 pnpm -F formio test:isolated
```

**This is not formio-server's `test:isolated`.** There the name means the specs listed in
every `test/tests/*.js` spec, run serially in one process, as opposed to the combined
`test/formio.js` registry. Here there is only one registry and every spec is already
isolated, so this script runs exactly the same suite as `pnpm test` — the difference is one
mocha worker per spec file instead of one process for all of them.

Mocha forks a worker per spec file. Two things make that safe, and both are easy to undo by
accident:

- **A worker loads its `--require` modules once but builds a new Mocha instance per file.**
  So a root hook registered at module scope in a required file attaches to that worker's
  first file and then silently vanishes for every file after it. Root hooks therefore live
  in `test/utils/root-hooks.js` as a **root hook plugin** (`mochaHooks`), which mocha
  re-applies to each instance.
- **The database drop is deliberately not registered in a worker.** There `afterAll` fires
  once per spec _file_, and dropping the database takes with it the indexes mongoose only
  builds at boot — every uniqueness assertion after that point would pass for the wrong
  reason. `test:isolated` sweeps at the end instead.

## Measured status

Every wrapper measured one test per process (`test:solo`), on a non-nextgen configuration.
**All 1724 tests pass when run entirely on their own**, and the whole suite is green in both
modes.

Measure on an idle machine. Several tests here are timing-sensitive (the isolate-backed ones
especially), so a solo sweep taken while other suites are running reports failures that are
contention, not dependencies — `vm.test.js` read 46/47 that way and is really 47/47.

| Wrapper                      | Alone   |                           |
| ---------------------------- | ------- | ------------------------- |
| `templates.test.js`          | 449/449 |                           |
| `submission-access.test.js`  | 430/430 |                           |
| `form.test.js`               | 201/201 | 2 fixed (pattern C)       |
| `submission.test.js`         | 188/188 |                           |
| `actions.test.js`            | 130/130 |                           |
| `auth.test.js`               | 103/103 |                           |
| `vm.test.js`                 | 47/47   | 1 fixed (pattern F)       |
| `roles.test.js`              | 42/42   |                           |
| `nested.test.js`             | 20/20   |                           |
| `resource.test.js`           | 20/20   |                           |
| `unit.test.js`               | 20/20   |                           |
| `CSVExporter.test.js`        | 19/19   | 2 fixed (pattern E)       |
| `NextgenCsvRenderer.test.js` | 18/18   |                           |
| `per-process-config.test.js` | 14/14   |                           |
| `validator.test.js`          | 12/12   | 11 fixed (patterns E + G) |
| `NextgenCSVExporter.test.js` | 4/4     |                           |
| `sweep-dbs.test.js`          | 4/4     |                           |
| `resolveExporter.test.js`    | 3/3     |                           |

Whole-suite, same tree, always **1724 passing / 0 failing**:

| Run                           | Wall clock |
| ----------------------------- | ---------- |
| `pnpm test` (serial)          | ~54s       |
| `pnpm test:isolated` (jobs 2) | ~28s       |
| `pnpm test:isolated` (jobs 4) | ~21s       |
| `pnpm test:isolated` (jobs 8) | ~23s       |

Wall clock cannot go below the slowest single file (`templates.test.js`, 449 tests), which
is why jobs 8 buys nothing over jobs 4 on an 8-core machine.

Four conversions did the work, all from
[`INDEPENDENCE.md`](../../../formio-server/test/tools/INDEPENDENCE.md):

- **E — guarded builder.** `validator.js`'s `Bootstrap` test and `CSVExporter.js`'s nested-form
  project/forms were built by leading tests and read by later ones. Guarded so the builder
  test still does the creating in file order and every later call is a no-op. Where the
  handle is module scope and other describes reassign it (`CSVExporter`'s `helper`), the
  guard keys on **identity**, not existence.
- **G — self-sufficient teardown.** `validator.js`'s `after` deleted the ids the `Bootstrap`
  _test_ set, so running any other test alone left it deleting `/form/undefined`. Mocha
  blames the failing hook on whichever test ran last, which is why nine tests appeared to
  fail for a reason none of them asserted.
- **C — derive instead of inherit.** Two `form.js` anonymous index tests pinned status 206,
  which only says the project holds more than one page of forms.
- **F — state inherited from another file.** `vm.test.js` boots no app, so its
  "resolve utils from the env bundle" test depended on some earlier wrapper having booted
  one and swapped the `@formio/core` Evaluator singleton. It registers what it needs now.
