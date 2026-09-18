'use strict';
const initializeApp = require('./initialize-app');

// The IS_NEXTGEN nock hooks that used to sit here are now in test/utils/root-hooks.js:
// registered at module scope they attach only to the first spec file of a parallel
// worker. See that file for why a root hook plugin is the only shape that survives.

// Absorbs property access on a ctx slot that Mocha's describe/parse phase reads
// before any `before` hook has populated it. The proxy target is a function so
// registration-time *calls* are absorbed too: test/templates.js runs
// `hook.alter('templateAlters', {})` in a describe body. It returns the `value`
// argument unchanged, which is what `alter` does when nothing implements the
// hook -- returning undefined would leave `alters` unusable in every test.
function makeUndefinedProxy() {
  return new Proxy(
    function (_name, value) {
      return value;
    },
    {
      get(_, prop) {
        if (prop === Symbol.toPrimitive) return () => undefined;
        if (prop === 'then') return undefined;
        return undefined;
      },
      set() {
        return true;
      },
    },
  );
}

function makeDeepProxy(ctx, target) {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (ctx[target] !== null && ctx[target] !== undefined) {
          return ctx[target][prop];
        }
        if (prop === Symbol.toPrimitive) return () => undefined;
        if (prop === 'then') return undefined;
        return makeUndefinedProxy();
      },
      set(_, prop, value) {
        if (ctx[target]) {
          ctx[target][prop] = value;
        }
        return true;
      },
    },
  );
}

/**
 * Creates an isolated Mocha test suite that bootstraps the formio app.
 *
 * @param {string} suiteName - The describe block label.
 * @param {Function} tests - test suite factory function(app, template, hook)
 * @param {Object} options
 * @param {boolean} options.skipUserRegistration - If true, initializeApp will not
 *   pre-register users. Use this for auth.test.js test suite which registers users itself.
 */
function makeTestSuite(suiteName, tests, options = {}) {
  describe(suiteName, function () {
    const ctx = { app: null, template: null, hook: null };

    before('Initialize the app', async function () {
      const init = await initializeApp(options);
      ctx.app = init.app;
      ctx.template = init.template;
      ctx.hook = init.hook;
    });

    const appProxy = new Proxy(
      function (...args) {
        return ctx.app(...args);
      },
      {
        get: (_, prop) => ctx.app?.[prop],
        set: (_, prop, value) => {
          if (ctx.app) ctx.app[prop] = value;
          return true;
        },
      },
    );

    const templateProxy = makeDeepProxy(ctx, 'template');
    const hookProxy = makeDeepProxy(ctx, 'hook');

    tests(appProxy, templateProxy, hookProxy);
  });
}

module.exports = makeTestSuite;
