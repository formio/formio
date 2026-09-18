# formio (OSS server)

## Identity

- **Path:** `apps/formio`. **Published as:** `formio` on npm (OSL-3.0).
- **OSS sync:** YES — `ossRepo: github.com/formio/formio`. Everything under `apps/formio/` ships publicly.
- **Module system:** CommonJS. **Language:** JavaScript only. Mixed callback / async-await era.
- **Purpose:** Node.js + Express + Mongoose server. REST API for forms, submissions, auth, and the action/resource system. The substrate `formio-server` extends.

## Floor — immutable musts

- **Do not put license-gated logic, secrets, or internal-only fixtures in `apps/formio/`.** Every file ships to `github.com/formio/formio` on the next release.
- **Do not silently modernize callbacks to async/await.** Some `hook.alter` call sites pass a callback and depend on the callback shape; converting them breaks every implementation in `formio-server/src/hooks/alter/`. Match the era of the file you're touching. See gotcha [`formio/hook-alter-callback-vs-async-01`](../../docs/gotchas/formio.md#hook-alter-callback-vs-async-01--some-alter-sites-use-callbacks-others-are-sync-dont-convert-without-auditing).
- **Do not rename or move files in `src/util/`, `src/middleware/`, or `src/models/` without auditing formio-server.** It deep-imports via `require('formio/src/...')` — your rename will break it with no compiler signal. See gotcha [`formio/cross-package-deep-require-01`](../../docs/gotchas/formio.md#cross-package-deep-require-01--formio-server-reaches-into-formios-internal-source).
- **DB migrations in `src/db/updates/` are one-way.** Never edit an existing migration after it ships; add a new numbered file instead. Make migrations idempotent. See [`formio/migrations-one-way-01`](../../docs/gotchas/formio.md#migrations-one-way-01--db-migrations-in-srcdbupdates-have-no-rollback).
- **`tokenHandler` must run before `permissionHandler` in the middleware chain** ([`apps/formio/index.js:88-177`](./index.js)). Access checks rely on `req.user` being populated.
- **No DOM dependencies in this package.** It must run headless.
- **Server changes ship adequate trace + debug + info logging.** New routes, actions, middleware, or branches log each internal step — iterations, queries, hook calls, cache lookups, timings, as identifiers and shapes (TRACE) — control-flow (DEBUG) and state changes (INFO) through a request-scoped `req.log.child({ module })` logger so production lines carry request context. Full fidelity of behavior, never of data: the no-secrets/no-PII rule holds at trace too. Loggers are objects — call level methods (`log.info(...)`), never the logger itself. See [STANDARDS.md §6](../../STANDARDS.md#6-logging) and [`formio/logger-object-not-callable-01`](../../docs/gotchas/formio.md#logger-object-not-callable-01--reqlog--child-is-a-logger-object-log-via-level-methods-never-call-it-directly).

## Ceiling — emerging patterns

- **Pattern: new middleware exports `(formio) => (req, res, next) => {...}` and is wired into the chain in `index.js`. Example:** [`src/middleware/tokenHandler.js`](./src/middleware/tokenHandler.js) is the most-extended reference shape; copy its structure for any new auth-adjacent middleware.
- **Pattern: `hook.alter('<name>', value, cb)` is the extension surface formio-server uses to inject behavior. New extension points are added at call sites in formio. Example:** [`src/util/hook.js`](./src/util/hook.js) defines the mechanism; grep `hook.alter(` to enumerate existing names before adding a new one.
- **Pattern: Mongoose models follow the BaseModel plugin shape. Example:** [`src/models/BaseModel.js`](./src/models/BaseModel.js) is the entry; existing models in [`src/models/`](./src/models/) all conform.
- **Pattern: REST resources subclass a shared base and register routes in `index.js`. Example:** [`src/resources/FormResource.js`](./src/resources/FormResource.js) — mirror this for any new top-level resource.
- **Pattern: each test suite is a `module.exports = (app, template, hook) => {...}` file in `test/`, paired with a sibling `<name>.test.js` wrapper that boots its own app via `makeTestSuite`. A suite with no wrapper never runs — the runner only picks up `.test.js` files.** Example: [`test/utils/makeTestSuite.js`](./test/utils/makeTestSuite.js) is the harness; [`test/unit.test.js`](./test/unit.test.js) is the minimal wrapper to copy.

## Blast radius

**1 workspace dependent** (`formio-server`) **plus unknown npm consumers.** Tier: medium (npm publication outweighs the single workspace dep). See [`/docs/dependencies/formio.md`](../../docs/dependencies/formio.md) for the change-impact matrix.

## Test & Build

```sh
pnpm -F formio test           # TEST_SUITE=1 mocha 'test/**/*.test.js' -t 60000 --no-node-snapshot --exit
pnpm -F formio test:isolated  # the same suite, one mocha worker per spec file (not formio-server's meaning)
pnpm -F formio test:solo      # each test alone in its own process (independence harness)
pnpm -F formio lint           # eslint . --fix
pnpm -F formio build          # webpack VM bundle (npm run build:vm)
```

"Green" = `test` + `lint` pass. There's no `check-types` script in this package (JS-only).

To narrow tests: run a single wrapper, e.g. `npx mocha test/unit.test.js -t 60000 --no-node-snapshot --exit`. Each wrapper boots its own app, so suites run independently; add `--grep '<pattern>'` to narrow further within one.

Three things about the harness are load-bearing:

- **`.mocharc.json` supplies the preloads** — `test/utils/isolate-process.js` (a per-process
  port and database, so two runs cannot wipe each other), `reuse-listener.js`,
  `unique-words.js` and `root-hooks.js`. They load ahead of every spec, which is the only
  placement that works: `config` resolves at require time.
- **Root hooks must be a root hook _plugin_** (`mochaHooks` in `test/utils/root-hooks.js`),
  never a bare `before`/`after` in a required file. A parallel worker loads its `--require`
  modules once but builds a new Mocha instance per file, so a module-scope root hook attaches
  to that worker's first file and silently vanishes for the rest.
- **Point `test:solo` at the wrapper, not the spec body.** `test/form.js` declares no tests
  until `test/form.test.js` calls it through `makeTestSuite`, so mocha cannot enumerate it.

See [`test/tools/README.md`](./test/tools/README.md) for the independence harness, the
leaked-database sweep, and the parallel-mode rules. How a spec should be written today (per-test
independence, old style → new style, definition of done):
[`/docs/patterns/server-testing.md`](../../docs/patterns/server-testing.md).

## Telemetry — this package has none

**There is no OpenTelemetry here, and there must not be.** Instrumentation is an enterprise
capability: `formio-server` owns the SDK bootstrap, the exporters, and every `@opentelemetry/*`
dependency. A standalone OSS server emits no traces and no metrics, and needs no OTel package
installed to serve a request.

What this package provides is the **seam** `formio-server` collects through — the `instrument` hook
plus the `count` / `observe` events, declared here and implemented there, the same division as the
`email` alter hook and field-level `encrypt`:

| Surface                                                                | Unimplemented behavior                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `hook.instrument(name, fn)` ([`src/util/hook.js`](./src/util/hook.js)) | returns `fn` itself — same reference, no wrapper     |
| `hook.report('count' \| 'observe', buildArgs)`                         | returns immediately; **`buildArgs` is never called** |

Three rules keep the seam honest, and [`test/instrumentation.test.js`](./test/instrumentation.test.js)
enforces all of them:

- **No `@opentelemetry/*` in any dependency field**, optional included, and no source file may
  require one. A consumer must be able to install this package without them.
- **No bootstrap.** No `instrumentation.js`, no `src/telemetry/`, and no npm script or Dockerfile
  that `--require`s one.
- **Report through `hook.report`, never `hook.invoke`.** A reported value can cost real work — the
  component-count measurement walks the whole component tree — and `invoke` evaluates its arguments
  whether or not anything is registered. `report` builds them only when something will receive
  them, and swallows anything thrown: telemetry is fire-and-forget and must never fail the request
  that produced the measurement.

The reported metric names live in [`src/util/metrics.js`](./src/util/metrics.js) and are **public
API** — they ship in the npm tarball and consumers' dashboards key on them. Declare a name there,
never inline at a call site; a test asserts `src/` mentions each one only in that file. The
instrument _kind_ behind each name (counter, histogram, gauge, units, buckets) is the
implementation's decision, not this package's.

## Hot paths & gotchas

See [`/docs/gotchas/formio.md`](../../docs/gotchas/formio.md). Current entries:

- `formio/hook-alter-silent-default-01` — typo'd hook name silently returns default
- `formio/hook-alter-callback-vs-async-01` — sync/callback shape must match
- `formio/cross-package-deep-require-01` — formio-server reaches into our source
- `formio/migrations-one-way-01` — no rollback for `src/db/updates/`
- `formio/vm-sandbox-fragile-01` — VM bundle is excluded from coverage
- `formio/session-lives-only-in-server-01` — Token here, Session in formio-server
- `formio/vm-boundary-bson-01` — live ObjectIds don't survive the VM round-trip
- `formio/save-as-reference-hydration-01` — reference values are pointers, hydrated on read
- `formio/mongo-features-detection-01` — DocumentDB/CosmosDB support; gate Mongo features on `mongoFeatures` probes
- `formio/logger-object-not-callable-01` — `req.log`/`.child()` is a Pino object; log via `.error`/`.info`, never call it as a function
- `formio/logger-flag-read-at-module-load-01` — the logger's `STRUCTURED_LOGGING` flag is read from `process.env`, not `hook.alter`; don't "fix" it
- `formio/req-log-mounted-outside-the-router-01` — `req.log` comes from `server.js`, not the router factory; synthetic `req`s in tests need a `log`
- `formio/test-specs-run-in-two-harnesses-01` — `test/` specs also run inside formio-server's isolated suite (mocked fetch, isolated DB); test under both
- `formio/hook-instrument-identity-and-wrap-timing-01` — `hook.instrument` returns the stage unchanged when unregistered (that is the contract), and must be called per request: middleware is built before hooks are assigned
- `formio/no-telemetry-in-oss-01` — this package carries no OTel dependency and no bootstrap; report through `hook.report`, never `hook.invoke`
- `formio/test-root-hooks-parallel-01` — a root hook in a preload stops running after a parallel worker's first spec file; use the `mochaHooks` plugin
- `formio/test-evaluator-registered-at-boot-01` — booting the app swaps the `@formio/core` Evaluator singleton process-wide; a test that boots no app inherits whatever ran first

## Cross-cutting triggers

- **Editing `src/middleware/tokenHandler.js` or `src/middleware/permissionHandler.js`** → coordinate with formio-server SSO callers; read [`/docs/cross-cutting/sso-session-flow.md`](../../docs/cross-cutting/sso-session-flow.md) before changing the contract.
- **Editing or adding a `hook.alter('...')` call site** → grep `apps/formio-server/src/hooks/alter/` to confirm name + shape; documenting the new hook here is mandatory because formio-server has no other way to discover it.
- **Editing `src/models/`** → check [`apps/formio-server/src/hooks/alter/models.js`](../../apps/formio-server/src/hooks/alter/models.js); enterprise injects fields via that hook.
- **Editing `src/util/util.js`, `src/util/hook.js`, or `src/util/encrypt.js`** → these are deep-imported by formio-server. Treat as public-API change.
- **Putting server-loaded Mongo docs into submission data, or touching reference (`reference: true`) handling** → read [`formio/vm-boundary-bson-01`](../../docs/gotchas/formio.md#vm-boundary-bson-01) and [`formio/save-as-reference-hydration-01`](../../docs/gotchas/formio.md#save-as-reference-hydration-01); the hydration contract spans `@formio/core`'s dereference processor — audit both sides.
- **Touching `src/vm/` (bundles, InstanceShim/RootShim, IsolateVMEvaluator), any `new IsolateVM(...)` site, or VM limits** → read [`/docs/cross-cutting/server-evaluation.md`](../../docs/cross-cutting/server-evaluation.md) (the client/server contract — shim parity, bundle rebuild, error semantics) and [`/docs/dependencies/vm.md`](../../docs/dependencies/vm.md) (six-instance inventory + config flow). Note `src/util/util.js:11-12` calls `mockBrowserContext()` at module load — fake DOM globals exist process-wide; see [`vm/host-global-mutation-01`](../../docs/gotchas/vm.md#host-global-mutation-01--mockbrowsercontext-fakes-dom-globals-on-the-host-process-and-formio-calls-it-at-module-load).
- **Using collation, `$lookup` with `let`/`pipeline`, compound nested-path indexes, or other beyond-baseline Mongo features** → gate on `mongoFeatures` (probed at [`src/db/index.js:262-296`](./src/db/index.js)) and ship a fallback, **or** stay on the vendor-common subset (equality-match `$lookup` + post-`$filter` — see `src/actions/properties/reference.js`, FIO-12058). Consumers exist in formio-server too. Reverted-twice evidence: FIO-11254/FIO-3899 (#804). See [`formio/mongo-features-detection-01`](../../docs/gotchas/formio.md#mongo-features-detection-01--the-server-must-run-on-mongodb-documentdb-and-cosmosdb-mongofeatures-startup-probes-are-the-only-capability-gate).
- **Touching reference Select index hydration (`src/actions/properties/reference.js` `$lookup`)** → do not reintroduce `$lookup.let` / `pipeline` (DocumentDB/Cosmos 400). Keep FIO-11566 access-control semantics in a post-`$filter`.
- **Gating OSS behavior on a feature flag** → this app cannot import the registry cleanly; call `hook.alter('isFeatureEnabled', '<KEY>')` with the flag's **key string** (resolved in [`apps/formio-server/src/hooks/alter/isFeatureEnabled.js`](../../apps/formio-server/src/hooks/alter/isFeatureEnabled.js)). The key must match the registry exactly. Read [`/docs/cross-cutting/feature-flag-registry-contract.md`](../../docs/cross-cutting/feature-flag-registry-contract.md). **One documented exception:** `src/util/logger` runs before `hook` exists, so it imports the registry object and resolves `STRUCTURED_LOGGING` from `process.env` — see [`formio/logger-flag-read-at-module-load-01`](../../docs/gotchas/formio.md#logger-flag-read-at-module-load-01) before changing it.
- **Adding or changing log calls** → read [`/docs/cross-cutting/logging.md`](../../docs/cross-cutting/logging.md) — the record format is the contract (`module` = the legacy `DEBUG` namespace; a second non-format argument is silently dropped; in legacy mode structured fields print as a JSON tail). The `formio/*` lint rules from `@formio/eslint-config/logging` enforce the call shape and the no-records rule; `test/logSafety.test.js` runs them over the tree as a test.
- **`major` bump** → coordinate with OSS release (github.com/formio/formio + npm publish).

## References

- Repo-wide: [`/CLAUDE.md`](../../CLAUDE.md), [`/STANDARDS.md`](../../STANDARDS.md)
- Architecture: [`/docs/architecture/formio.md`](../../docs/architecture/formio.md)
- Dependencies: [`/docs/dependencies/formio.md`](../../docs/dependencies/formio.md)
- Gotchas: [`/docs/gotchas/formio.md`](../../docs/gotchas/formio.md)
- Cross-cutting: [`/docs/cross-cutting/sso-session-flow.md`](../../docs/cross-cutting/sso-session-flow.md)
