'use strict';

// Points `request(app)` at the server the app is already listening on.
//
// Handed an express app (a function), supertest wraps it in a NEW http.Server, listens on
// port 0, and closes it again once the response lands -- once per request. This suite
// makes tens of thousands of requests, so that is tens of thousands of bind/close cycles
// churning through the ephemeral port range, and a small share of them come back wrong:
// the client parses a 404 with an empty chunked body that the server provably never sent
// (see test/tools/INDEPENDENCE.md, "the residual flake"). test/utils/initialize-app.js already listens on
// config.port, so there is a perfectly good server to reuse.
//
// This has to be a mocha `--require`, ahead of the spec files: they take their reference
// with a top-level `require('supertest')`, so swapping the module afterwards would not
// reach them. The listener does not exist yet at that point, hence the registry --
// initialize-app.js fills it in once the server is up, and until then every call falls
// through to stock supertest.
const supertest = require('supertest');

const registered = [];

// The suites are handed `appProxy` from makeTestSuite rather than the app
// itself, so identity alone misses every one of them. The proxy forwards property reads
// to the same app, and `formio` is the object the whole server hangs off -- if that
// matches, this is our app wearing a different wrapper.
const isOurApp = (target, app) =>
  target === app || (typeof target === 'function' && target.formio && target.formio === app.formio);

const reusing = function (target, options) {
  // Only a registered app, and only the plain http path: a spec passing a url, its own
  // server, or asking for http2 still gets stock behaviour.
  if (!(options && options.http2)) {
    const match = registered.find(({ app }) => isOurApp(target, app));
    if (match) {
      return supertest(match.listener, options);
    }
  }
  return supertest(target, options);
};

// Carries `Test` and `agent` across; specs and helpers reach for both.
Object.assign(reusing, supertest);

require.cache[require.resolve('supertest')].exports = reusing;

module.exports = {
  register: (app, listener) => registered.push({ app, listener }),
};
