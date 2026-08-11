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

## Ceiling — emerging patterns

- **Pattern: new middleware exports `(formio) => (req, res, next) => {...}` and is wired into the chain in `index.js`. Example:** [`src/middleware/tokenHandler.js`](./src/middleware/tokenHandler.js) is the most-extended reference shape; copy its structure for any new auth-adjacent middleware.
- **Pattern: `hook.alter('<name>', value, cb)` is the extension surface formio-server uses to inject behavior. New extension points are added at call sites in formio. Example:** [`src/util/hook.js`](./src/util/hook.js) defines the mechanism; grep `hook.alter(` to enumerate existing names before adding a new one.
- **Pattern: Mongoose models follow the BaseModel plugin shape. Example:** [`src/models/BaseModel.js`](./src/models/BaseModel.js) is the entry; existing models in [`src/models/`](./src/models/) all conform.
- **Pattern: REST resources subclass a shared base and register routes in `index.js`. Example:** [`src/resources/FormResource.js`](./src/resources/FormResource.js) — mirror this for any new top-level resource.
- **Pattern: tests are mocha files in `test/` imported by `test/test.js`. New test files MUST be registered there or they won't run.** Example: [`test/test.js`](./test/test.js).

## Blast radius

**1 workspace dependent** (`formio-server`) **plus unknown npm consumers.** Tier: medium (npm publication outweighs the single workspace dep). See [`/docs/dependencies/formio.md`](../../docs/dependencies/formio.md) for the change-impact matrix.

## Test & Build

```sh
pnpm -F formio test    # TEST_SUITE=1 mocha test/test.js -b -t 60000 --no-node-snapshot --trace-warnings --exit
pnpm -F formio lint    # eslint . --fix
pnpm -F formio build   # webpack VM bundle (npm run build:vm)
```

"Green" = `test` + `lint` pass. There's no `check-types` script in this package (JS-only).

To narrow tests: add `--grep '<pattern>'` to the mocha command. The single recursive `test/test.js` import means there's no per-file mode without grep.

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

## Cross-cutting triggers

- **Editing `src/middleware/tokenHandler.js` or `src/middleware/permissionHandler.js`** → coordinate with formio-server SSO callers; read [`/docs/cross-cutting/sso-session-flow.md`](../../docs/cross-cutting/sso-session-flow.md) before changing the contract.
- **Editing or adding a `hook.alter('...')` call site** → grep `apps/formio-server/src/hooks/alter/` to confirm name + shape; documenting the new hook here is mandatory because formio-server has no other way to discover it.
- **Editing `src/models/`** → check [`apps/formio-server/src/hooks/alter/models.js`](../../apps/formio-server/src/hooks/alter/models.js); enterprise injects fields via that hook.
- **Editing `src/util/util.js`, `src/util/hook.js`, or `src/util/encrypt.js`** → these are deep-imported by formio-server. Treat as public-API change.
- **Putting server-loaded Mongo docs into submission data, or touching reference (`reference: true`) handling** → read [`formio/vm-boundary-bson-01`](../../docs/gotchas/formio.md#vm-boundary-bson-01) and [`formio/save-as-reference-hydration-01`](../../docs/gotchas/formio.md#save-as-reference-hydration-01); the hydration contract spans `@formio/core`'s dereference processor — audit both sides.
- **Touching `src/vm/` (bundles, InstanceShim/RootShim, IsolateVMEvaluator), any `new IsolateVM(...)` site, or VM limits** → read [`/docs/cross-cutting/server-evaluation.md`](../../docs/cross-cutting/server-evaluation.md) (the client/server contract — shim parity, bundle rebuild, error semantics) and [`/docs/dependencies/vm.md`](../../docs/dependencies/vm.md) (six-instance inventory + config flow). Note `src/util/util.js:11-12` calls `mockBrowserContext()` at module load — fake DOM globals exist process-wide; see [`vm/host-global-mutation-01`](../../docs/gotchas/vm.md#host-global-mutation-01--mockbrowsercontext-fakes-dom-globals-on-the-host-process-and-formio-calls-it-at-module-load).
- **Using collation, `$lookup` with `let`/`pipeline`, compound nested-path indexes, or other beyond-baseline Mongo features** → gate on `mongoFeatures` (probed at [`src/db/index.js:262-296`](./src/db/index.js)) and ship a fallback, **or** stay on the vendor-common subset (equality-match `$lookup` + post-`$filter` — see `src/actions/properties/reference.js`, FIO-12058). Consumers exist in formio-server too. Reverted-twice evidence: FIO-11254/FIO-3899 (#804). See [`formio/mongo-features-detection-01`](../../docs/gotchas/formio.md#mongo-features-detection-01--the-server-must-run-on-mongodb-documentdb-and-cosmosdb-mongofeatures-startup-probes-are-the-only-capability-gate).
- **Touching reference Select index hydration (`src/actions/properties/reference.js` `$lookup`)** → do not reintroduce `$lookup.let` / `pipeline` (DocumentDB/Cosmos 400). Keep FIO-11566 access-control semantics in a post-`$filter`.
- **Gating OSS behavior on a feature flag** → this app cannot import the registry cleanly; call `hook.alter('isFeatureEnabled', '<KEY>')` with the flag's **key string** (resolved in [`apps/formio-server/src/hooks/alter/isFeatureEnabled.js`](../../apps/formio-server/src/hooks/alter/isFeatureEnabled.js)). The key must match the registry exactly. Read [`/docs/cross-cutting/feature-flag-registry-contract.md`](../../docs/cross-cutting/feature-flag-registry-contract.md).
- **`major` bump** → coordinate with OSS release (github.com/formio/formio + npm publish).

## References

- Repo-wide: [`/CLAUDE.md`](../../CLAUDE.md), [`/STANDARDS.md`](../../STANDARDS.md)
- Architecture: [`/docs/architecture/formio.md`](../../docs/architecture/formio.md)
- Dependencies: [`/docs/dependencies/formio.md`](../../docs/dependencies/formio.md)
- Gotchas: [`/docs/gotchas/formio.md`](../../docs/gotchas/formio.md)
- Cross-cutting: [`/docs/cross-cutting/sso-session-flow.md`](../../docs/cross-cutting/sso-session-flow.md)
