/* eslint-env mocha */
'use strict';

/**
 * Standalone instrumentation suite, for the same reason as test/telemetry.test.js: the shared
 * `<name>.js` + `<name>.test.js` pairs in this directory are also run by formio-server's isolated
 * suite, and everything here is about what the OSS package does on its own.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const request = require('./formio-supertest');
const makeTestSuite = require('./utils/makeTestSuite');
const getHook = require('../src/util/hook');
const metrics = require('../src/util/metrics');

describe('hook.instrument', function () {
  it('returns the same function when nothing implements it', function () {
    const hook = getHook({ hooks: {} });
    const stage = async function stage() {};

    assert.strictEqual(hook.instrument('stage', stage), stage);
  });

  it('returns the implementation wrapper, which receives the original arguments', async function () {
    const received = [];
    const hook = getHook({
      hooks: {
        instrument: (fn) =>
          function (...args) {
            received.push(args);
            return fn(...args);
          },
      },
    });
    const stage = async function stage() {};
    const wrapped = hook.instrument('stage', stage);

    assert.notStrictEqual(wrapped, stage, 'expected the implementation wrapper, not the stage');

    await wrapped('before', { url: '/' });

    assert.deepStrictEqual(received, [['before', { url: '/' }]]);
  });

  it('passes the stage name to the implementation', function () {
    const received = [];
    const hook = getHook({
      hooks: {
        instrument: (fn, name) => {
          received.push(name);
          return fn;
        },
      },
    });

    hook.instrument('loadCurrentForm', async () => {});

    assert.deepStrictEqual(received, ['loadCurrentForm']);
  });

  it('keeps the rest of the hook surface intact', function () {
    // formio-server deep-requires this module (src/templates/projectTemplate.js and
    // src/resources/TagResource.js), so the existing methods are a published seam.
    const hook = getHook({ hooks: {} });

    assert.deepStrictEqual(Object.keys(hook).sort(), [
      'alter',
      'instrument',
      'invoke',
      'report',
      'settings',
    ]);
  });
});

describe('Metric hook vocabulary', function () {
  const METRIC_NAMES = [
    'formio.submission.field_handlers',
    'formio.form.components',
    'formio.submission.created',
  ];

  it('declares every metric name formio reports', function () {
    assert.deepStrictEqual(Object.values(metrics).sort(), [...METRIC_NAMES].sort());
  });

  it('is the only place in src/ the names appear', function () {
    // These names ship in the npm package and are what a consumer's dashboards key on. A literal
    // at a call site drifts silently; this fails the build instead.
    const src = path.join(__dirname, '..', 'src');
    const declaration = path.join('util', 'metrics.js');

    const offenders = fs
      .readdirSync(src, { recursive: true })
      .filter((entry) => entry.endsWith('.js') && entry !== declaration)
      .filter((entry) => {
        const contents = fs.readFileSync(path.join(src, entry), 'utf8');
        return METRIC_NAMES.some((name) => contents.includes(name));
      });

    assert.deepStrictEqual(
      offenders,
      [],
      'metric names must be referenced through src/util/metrics.js',
    );
  });
});

describe('OpenTelemetry is not part of this package', function () {
  // Instrumentation is an enterprise capability. This package declares the hook seam and ships no
  // bootstrap, no SDK, and no OpenTelemetry dependency of any kind — a standalone OSS server has
  // the hooks and nothing behind them. These are static guards because the failure they catch
  // cannot be observed from a process that has the packages installed, which every CI run does.

  it('declares no OpenTelemetry package in any dependency field', function () {
    const pkg = require('../package.json');
    const declared = {
      ...pkg.dependencies,
      ...pkg.peerDependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
    };

    assert.deepStrictEqual(
      Object.keys(declared).filter((name) => name.startsWith('@opentelemetry/')),
      [],
      'the OSS package must install without any OpenTelemetry package, optional or otherwise',
    );
  });

  it('ships no telemetry bootstrap', function () {
    const root = path.join(__dirname, '..');

    assert.ok(
      !fs.existsSync(path.join(root, 'instrumentation.js')),
      'the SDK bootstrap belongs to formio-server; this package must not carry one',
    );
    assert.ok(
      !fs.existsSync(path.join(root, 'src', 'telemetry')),
      'src/telemetry/ is the bootstrap support directory and must not exist here',
    );
  });

  it('requires OpenTelemetry from nowhere in src/', function () {
    const src = path.join(__dirname, '..', 'src');

    const importers = fs
      .readdirSync(src, { recursive: true })
      .filter((entry) => entry.endsWith('.js'))
      .filter((entry) =>
        fs.readFileSync(path.join(src, entry), 'utf8').includes('@opentelemetry/'),
      );

    assert.deepStrictEqual(importers, [], 'no source file may reach for an OpenTelemetry package');
  });

  it('preloads no bootstrap from a start script or the Dockerfile', function () {
    const pkg = require('../package.json');
    const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');

    const preloading = Object.entries(pkg.scripts)
      .filter(([, script]) => script.includes('instrumentation'))
      .map(([name]) => name);

    assert.deepStrictEqual(preloading, [], 'no npm script may --require a telemetry bootstrap');
    assert.ok(
      !dockerfile.includes('instrumentation'),
      'the OSS image must start without a telemetry preload',
    );
  });

  it('reports metrics through the hook seam alone, with no telemetry module in the way', function () {
    // `submissionHandler` is where the reporting call sites live. It must load, and serve, with
    // nothing but formio's own modules — the metric names are plain strings.
    const handlerSource = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'middleware', 'submissionHandler.js'),
      'utf8',
    );

    assert.ok(
      !handlerSource.includes('telemetry'),
      'the reporting call sites must not reach into a telemetry directory',
    );
    assert.deepStrictEqual(
      [...handlerSource.matchAll(/hook\.report\('(count|observe)'/g)].map((match) => match[1]),
      ['observe', 'observe', 'count'],
      'every metric call site must go through the guarded reporter',
    );
  });
});

describe('hook.invoke for metrics', function () {
  it('reports nothing when count and observe are unregistered', function () {
    const hook = getHook({ hooks: {} });

    assert.strictEqual(hook.invoke('count', metrics.SUBMISSION_CREATED, 1, {}), false);
    assert.strictEqual(hook.invoke('observe', metrics.FORM_COMPONENTS, 7, {}), false);
  });
});

describe('hook.report', function () {
  it('does not build its arguments when nothing is registered', function () {
    // The reported values are not free — `formio.form.components` walks the component tree — so an
    // OSS server with no implementation must never pay to compute a measurement nobody collects.
    const hook = getHook({ hooks: {} });
    let built = 0;

    hook.report('observe', () => {
      built++;
      return [metrics.FORM_COMPONENTS, 7, {}];
    });

    assert.strictEqual(built, 0);
  });

  it('passes the built arguments to the implementation', function () {
    const received = [];
    const hook = getHook({
      hooks: { on: { observe: (...args) => received.push(args) } },
    });

    hook.report('observe', () => [metrics.FORM_COMPONENTS, 7, { 'http.request.method': 'POST' }]);

    assert.deepStrictEqual(received, [
      [metrics.FORM_COMPONENTS, 7, { 'http.request.method': 'POST' }],
    ]);
  });

  it('swallows an implementation that throws', function () {
    // Reporting is fire-and-forget: a telemetry failure must never fail the request that produced
    // the measurement.
    const hook = getHook({
      hooks: {
        on: {
          count: () => {
            throw new Error('meter is in a bad state');
          },
        },
      },
    });

    assert.doesNotThrow(() => hook.report('count', () => [metrics.SUBMISSION_CREATED, 1, {}]));
  });

  it('swallows a builder that throws', function () {
    const hook = getHook({ hooks: { on: { observe: () => {} } } });

    assert.doesNotThrow(() =>
      hook.report('observe', () => {
        throw new Error('malformed component tree');
      }),
    );
  });
});

makeTestSuite('Instrumented submission lifecycle', (app, template, hook) => {
  const FORM = {
    title: 'Instrumentation Form',
    name: 'instrumentationForm',
    path: 'instrumentation/form',
    type: 'form',
    components: [
      {
        type: 'textfield',
        key: 'name',
        label: 'Name',
        input: true,
        validate: { required: true },
      },
      // An email component, so each validation pass fans out to a field handler and
      // formio.submission.field_handlers is a count of something rather than zero.
      {
        type: 'email',
        key: 'email',
        label: 'Email',
        input: true,
      },
    ],
  };

  // Registered per test rather than in test/hooks.js: `hook.instrument` and `hook.invoke` both read
  // `formio.hooks` at call time, so a stage does not have to be wrapped before the app boots.
  const stubHooks = () => {
    const stages = [];
    const reported = [];

    app.formio.hooks.instrument = (fn, name) =>
      async function instrumented(...args) {
        stages.push(name);
        return fn(...args);
      };
    app.formio.hooks.on.count = (name, n, attributes) =>
      reported.push({ verb: 'count', name, value: n, attributes });
    app.formio.hooks.on.observe = (name, value, attributes) =>
      reported.push({ verb: 'observe', name, value, attributes });

    return { stages, reported };
  };

  const removeStubHooks = () => {
    delete app.formio.hooks.instrument;
    delete app.formio.hooks.on.count;
    delete app.formio.hooks.on.observe;
  };

  let form;

  before('Creates a form to submit to', async () => {
    const res = await request(app)
      .post(hook.alter('url', '/form', template))
      .set('x-jwt-token', template.users.admin.token)
      .send(FORM)
      .expect(201);

    form = res.body;
  });

  afterEach(removeStubHooks);

  const submit = () =>
    request(app)
      .post(hook.alter('url', `/form/${form._id}/submission`, template))
      .set('x-jwt-token', template.users.admin.token)
      .send({ data: { name: 'Instrumented', email: 'instrumented@example.com' } })
      .expect(201);

  it('instruments every lifecycle stage of a submission POST', async () => {
    const stub = stubHooks();

    await submit();

    // executeFieldHandlers runs unvalidated, then validated, then again in the after handler;
    // executeActions runs once before the submission is saved and once after.
    assert.deepStrictEqual(stub.stages, [
      'loadCurrentForm',
      'initializeSubmission',
      'initializeActions',
      'executeFieldHandlers',
      'validateSubmission',
      'executeFieldHandlers',
      'executeActions',
      'executeFieldHandlers',
      'executeActions',
    ]);
  });

  it('reports the submission metrics of a POST', async () => {
    const stub = stubHooks();

    await submit();

    assert.deepStrictEqual(
      stub.reported.map(({ verb, name, value }) => ({ verb, name, value })),
      [
        { verb: 'observe', name: metrics.FORM_COMPONENTS, value: 2 },
        { verb: 'observe', name: metrics.SUBMISSION_FIELD_HANDLERS, value: 1 },
        { verb: 'observe', name: metrics.SUBMISSION_FIELD_HANDLERS, value: 1 },
        { verb: 'observe', name: metrics.SUBMISSION_FIELD_HANDLERS, value: 1 },
        { verb: 'count', name: metrics.SUBMISSION_CREATED, value: 1 },
      ],
    );

    assert.deepStrictEqual(
      stub.reported
        .filter((report) => report.name === metrics.SUBMISSION_FIELD_HANDLERS)
        .map((report) => report.attributes.validated),
      [false, true, true],
    );
  });

  it('reports no attribute that mints a time series per form', async () => {
    const stub = stubHooks();

    await submit();

    // Demand positive evidence first. Asserting only "the form identity is absent" would pass just
    // as happily when nothing is reported at all.
    assert.ok(
      stub.reported.length > 0,
      'nothing was reported, so this assertion would prove nothing',
    );

    const values = stub.reported.flatMap((report) => Object.values(report.attributes || {}));
    const forbidden = [form._id, form.name, form.title, form.path];

    assert.deepStrictEqual(
      values.filter((value) => forbidden.includes(value)),
      [],
      'a metric attribute carried the form identity',
    );
    assert.deepStrictEqual(
      stub.reported.filter((report) => 'project' in (report.attributes || {})),
      [],
    );
  });

  it('answers a submission POST identically whether or not metrics are reported', async () => {
    const generated = ['_id', 'created', 'modified', 'owner'];
    const comparable = (body) => {
      const rest = { ...body };
      generated.forEach((key) => delete rest[key]);
      return rest;
    };

    const stub = stubHooks();
    const reported = await submit();
    removeStubHooks();
    const unreported = await submit();

    assert.ok(stub.reported.length > 0, 'the first submission should have reported metrics');
    assert.deepStrictEqual(comparable(reported.body), comparable(unreported.body));
  });

  it('counts a submission that was persisted before a blocking after-action failed', async () => {
    // `formio.submission.created` means persisted, not attempted. resourcejs has already written the
    // document by the time the after handler runs, so an after-action that throws — a webhook
    // answering 500, say — must not take the count with it.
    const stub = stubHooks();
    app.formio.hooks.instrument = (fn, name) =>
      async function instrumented(...args) {
        if (name === 'executeActions' && args[0] === 'after') {
          throw new Error('blocking after-action failed');
        }
        return fn(...args);
      };

    const res = await request(app)
      .post(hook.alter('url', `/form/${form._id}/submission`, template))
      .set('x-jwt-token', template.users.admin.token)
      .send({ data: { name: 'Instrumented', email: 'instrumented@example.com' } });

    assert.notStrictEqual(res.status, 201, 'the after-action failure should surface to the client');
    assert.deepStrictEqual(
      stub.reported
        .filter((report) => report.name === metrics.SUBMISSION_CREATED)
        .map(({ verb, value }) => ({ verb, value })),
      [{ verb: 'count', value: 1 }],
    );
  });

  it('accepts a submission when the metric implementations throw', async () => {
    // Reporting is fire-and-forget. An implementation in a bad state must degrade to no telemetry,
    // never to a failed submission — the request had already done its real work by then.
    app.formio.hooks.on.count = () => {
      throw new Error('meter is in a bad state');
    };
    app.formio.hooks.on.observe = () => {
      throw new Error('meter is in a bad state');
    };

    await submit();
  });
});
