/* eslint-env mocha */
'use strict';

const assert = require('assert');
const debug = require('debug');
const { FEATURE_FLAGS } = require('@formio/feature-flags');
const {
  resolveLogMode,
  getLoggerOptions,
  isStructuredLoggingEnabled,
} = require('../src/util/logger/appLogger');
const { getHttpLoggerOptions, serializeRequest } = require('../src/util/logger/httpLogger');
const {
  shouldEmit,
  emit,
  createLegacyDestination,
} = require('../src/util/logger/legacyDestination');

// pino numeric levels
const TRACE = 10;
const DEBUG = 20;
const INFO = 30;
const WARN = 40;
const ERROR = 50;
const FATAL = 60;

// Restore an environment variable to the value it held before a test overwrote it.
const restoreEnv = (name, saved) => {
  if (saved === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = saved;
  }
};

describe('Logger - mode resolution with structured logging enabled', function () {
  let savedFormat, savedDebug, savedFlag;

  beforeEach(function () {
    savedFormat = process.env.FORMIO_LOG_FORMAT;
    savedDebug = process.env.DEBUG;
    savedFlag = process.env.FORMIO_STRUCTURED_LOGGING;
    delete process.env.FORMIO_LOG_FORMAT;
    delete process.env.DEBUG;
    process.env.FORMIO_STRUCTURED_LOGGING = 'true';
  });

  afterEach(function () {
    restoreEnv('FORMIO_LOG_FORMAT', savedFormat);
    restoreEnv('DEBUG', savedDebug);
    restoreEnv('FORMIO_STRUCTURED_LOGGING', savedFlag);
  });

  it('defaults to json when neither FORMIO_LOG_FORMAT nor DEBUG is set', function () {
    assert.strictEqual(resolveLogMode(), 'json');
  });

  it('resolves to legacy when DEBUG is set', function () {
    process.env.DEBUG = 'formio:*';
    assert.strictEqual(resolveLogMode(), 'legacy');
  });

  it('honors FORMIO_LOG_FORMAT=legacy', function () {
    process.env.FORMIO_LOG_FORMAT = 'legacy';
    assert.strictEqual(resolveLogMode(), 'legacy');
  });

  it('FORMIO_LOG_FORMAT=json overrides a present DEBUG', function () {
    process.env.FORMIO_LOG_FORMAT = 'json';
    process.env.DEBUG = 'formio:*';
    assert.strictEqual(resolveLogMode(), 'json');
  });
});

describe('Logger - LOG_LEVEL outside a TTY', function () {
  let savedLevel;

  beforeEach(function () {
    savedLevel = process.env.LOG_LEVEL;
  });

  afterEach(function () {
    if (savedLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = savedLevel;
    }
  });

  it('returns options carrying LOG_LEVEL even when stdout is not a TTY', function () {
    if (process.stdout.isTTY) {
      this.skip();
    }
    process.env.LOG_LEVEL = 'debug';
    const options = getLoggerOptions();
    assert.ok(options, 'expected options to be returned in a non-TTY environment');
    assert.strictEqual(options.level, 'debug');
  });
});

describe('Logger - legacy emission rules', function () {
  afterEach(function () {
    debug.disable();
  });

  it('emits trace/debug only when the namespace matches DEBUG', function () {
    debug.enable('formio:match');
    assert.strictEqual(shouldEmit(DEBUG, 'formio:match'), true);
    assert.strictEqual(shouldEmit(DEBUG, 'formio:other'), false);
    assert.strictEqual(shouldEmit(TRACE, 'formio:other'), false);
  });

  it('passes info through regardless of DEBUG', function () {
    debug.disable();
    assert.strictEqual(shouldEmit(INFO, 'formio:anything'), true);
  });

  it('always emits warn/error/fatal regardless of DEBUG', function () {
    debug.disable();
    assert.strictEqual(shouldEmit(WARN, 'formio:x'), true);
    assert.strictEqual(shouldEmit(ERROR, 'formio:x'), true);
    assert.strictEqual(shouldEmit(FATAL, 'formio:x'), true);
  });
});

describe('Logger - legacy emit routing', function () {
  let output, savedLog;

  beforeEach(function () {
    output = [];
    savedLog = debug.log;
    debug.log = function (...args) {
      output.push(args.join(' '));
    };
  });

  afterEach(function () {
    debug.log = savedLog;
    debug.disable();
  });

  it('routes a matching debug record to debug output', function () {
    debug.enable('formio:cache');
    emit({ level: DEBUG, module: 'formio:cache', msg: 'loaded form' });
    assert.strictEqual(output.length, 1);
    assert.ok(output[0].includes('loaded form'));
  });

  it('suppresses a non-matching debug record', function () {
    debug.enable('formio:cache');
    emit({ level: DEBUG, module: 'formio:other', msg: 'nope' });
    assert.strictEqual(output.length, 0);
  });

  it('emits a warn record even when the namespace does not match DEBUG', function () {
    debug.enable('formio:cache');
    emit({ level: WARN, module: 'formio:other', msg: 'a warning' });
    assert.strictEqual(output.length, 1);
    assert.ok(output[0].includes('a warning'));
  });
});

describe('Logger - legacy destination', function () {
  let output, savedLog;

  beforeEach(function () {
    output = [];
    savedLog = debug.log;
    debug.log = function (...args) {
      output.push(args.join(' '));
    };
  });

  afterEach(function () {
    debug.log = savedLog;
    debug.disable();
  });

  it('parses a pino NDJSON record and routes it to debug', function () {
    debug.enable('formio:cache');
    const destination = createLegacyDestination();
    destination.write(JSON.stringify({ level: INFO, module: 'formio:cache', msg: 'hello' }) + '\n');
    assert.strictEqual(output.length, 1);
    assert.ok(output[0].includes('hello'));
  });
});

describe('Logger - structured logging feature flag', function () {
  let savedFlag, savedFormat, savedDebug;

  beforeEach(function () {
    savedFlag = process.env.FORMIO_STRUCTURED_LOGGING;
    savedFormat = process.env.FORMIO_LOG_FORMAT;
    savedDebug = process.env.DEBUG;
    delete process.env.FORMIO_STRUCTURED_LOGGING;
    delete process.env.FORMIO_LOG_FORMAT;
    delete process.env.DEBUG;
  });

  afterEach(function () {
    restoreEnv('FORMIO_STRUCTURED_LOGGING', savedFlag);
    restoreEnv('FORMIO_LOG_FORMAT', savedFormat);
    restoreEnv('DEBUG', savedDebug);
  });

  it('registers STRUCTURED_LOGGING in the feature flag registry, off by default', function () {
    const flag = FEATURE_FLAGS.STRUCTURED_LOGGING;
    assert.ok(flag, 'expected a STRUCTURED_LOGGING entry in FEATURE_FLAGS');
    assert.strictEqual(flag.key, 'STRUCTURED_LOGGING');
    assert.strictEqual(flag.envVar, 'FORMIO_STRUCTURED_LOGGING');
    assert.strictEqual(flag.defaultValue, false);
  });

  it('reports the flag as disabled when the env var is unset', function () {
    assert.strictEqual(isStructuredLoggingEnabled(), false);
  });

  it('reports the flag as enabled when the env var is true', function () {
    process.env.FORMIO_STRUCTURED_LOGGING = 'true';
    assert.strictEqual(isStructuredLoggingEnabled(), true);
  });

  it('matches the enterprise parser and accepts a differently-cased true', function () {
    // apps/formio-server/config.js resolves the same env var through parseBoolean, which
    // lowercases -- the two must not disagree about the flag inside one process.
    process.env.FORMIO_STRUCTURED_LOGGING = 'TRUE';
    assert.strictEqual(isStructuredLoggingEnabled(), true);
  });

  it('defaults to legacy output while the flag is off', function () {
    assert.strictEqual(resolveLogMode(), 'legacy');
  });

  it('stays legacy when the flag is explicitly false', function () {
    process.env.FORMIO_STRUCTURED_LOGGING = 'false';
    assert.strictEqual(resolveLogMode(), 'legacy');
  });

  it('stays legacy even when FORMIO_LOG_FORMAT asks for json', function () {
    process.env.FORMIO_LOG_FORMAT = 'json';
    assert.strictEqual(resolveLogMode(), 'legacy');
  });
});

describe('Logger - HTTP request logging behind the flag', function () {
  let savedFlag;

  beforeEach(function () {
    savedFlag = process.env.FORMIO_STRUCTURED_LOGGING;
    delete process.env.FORMIO_STRUCTURED_LOGGING;
  });

  afterEach(function () {
    restoreEnv('FORMIO_STRUCTURED_LOGGING', savedFlag);
  });

  it('disables automatic request/response logging while the flag is off', function () {
    assert.strictEqual(getHttpLoggerOptions().autoLogging, false);
  });

  it('enables automatic request/response logging once the flag is on', function () {
    process.env.FORMIO_STRUCTURED_LOGGING = 'true';
    assert.strictEqual(getHttpLoggerOptions().autoLogging, true);
  });
});

describe('Logger - request id generation (CVE-2026-41907)', function () {
  const fs = require('fs');
  const path = require('path');
  const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('reuses an existing req.id', function () {
    const { genReqId } = getHttpLoggerOptions();
    assert.strictEqual(genReqId({ id: 'already-set' }), 'already-set');
  });

  it('generates a UUID v4 when the request has no id', function () {
    const { genReqId } = getHttpLoggerOptions();
    assert.match(genReqId({}), UUID_V4);
  });
});

describe('Logger - secret redaction', function () {
  const { Writable } = require('stream');
  const pino = require('pino');

  // Build a logger from the real options but writing somewhere we can read back.
  const captureRecords = () => {
    const lines = [];
    const stream = new Writable({
      write(chunk, encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const options = getLoggerOptions();
    // pino-pretty would be attached in a TTY; we want the raw JSON here.
    delete options.transport;
    return { logger: pino(options, stream), read: () => lines.join('') };
  };

  const requestWith = (overrides) => ({
    id: 'req-1',
    method: 'GET',
    url: '/project/123/form',
    query: {},
    headers: { host: 'localhost', 'user-agent': 'test' },
    ...overrides,
  });

  it('redacts the project API key header from a serialized record', function () {
    const { logger: log, read } = captureRecords();

    log.info({ req: requestWith({ headers: { 'x-token': 'PROJECT_API_KEY' } }) }, 'request');

    assert.ok(
      !read().includes('PROJECT_API_KEY'),
      `x-token is a non-expiring project admin credential and must never reach the log: ${read()}`,
    );
  });

  it('redacts the server admin key header from a serialized record', function () {
    const { logger: log, read } = captureRecords();

    log.info({ req: requestWith({ headers: { 'x-admin-key': 'SERVER_ADMIN_KEY' } }) }, 'request');

    assert.ok(
      !read().includes('SERVER_ADMIN_KEY'),
      `x-admin-key grants server-wide admin and must never reach the log: ${read()}`,
    );
  });

  it('redacts session credential headers from a serialized record', function () {
    const { logger: log, read } = captureRecords();

    log.info(
      {
        req: requestWith({
          headers: {
            'x-jwt-token': 'JWT_VALUE',
            authorization: 'Bearer BEARER_VALUE',
            cookie: 'session=COOKIE_VALUE',
          },
        }),
      },
      'request',
    );

    const output = read();
    assert.ok(!output.includes('JWT_VALUE'), `x-jwt-token leaked: ${output}`);
    assert.ok(!output.includes('BEARER_VALUE'), `authorization leaked: ${output}`);
    assert.ok(!output.includes('COOKIE_VALUE'), `cookie leaked: ${output}`);
  });

  it('redacts the API key passed as a query parameter', function () {
    const { logger: log, read } = captureRecords();

    // apiKey.js accepts the key as ?token= when the header is absent.
    log.info({ req: requestWith({ query: { token: 'APIKEY_IN_QUERY', page: '2' } }) }, 'request');

    assert.ok(!read().includes('APIKEY_IN_QUERY'), `req.query.token leaked: ${read()}`);
  });

  it('strips the API key from the raw request url', function () {
    // Redacting req.query is not enough -- the serialized url keeps its query string.
    const serialized = serializeRequest(
      requestWith({
        url: '/project/123/form?token=APIKEY_IN_QUERY&page=2',
        query: { token: 'APIKEY_IN_QUERY', page: '2' },
      }),
    );

    assert.ok(
      !JSON.stringify(serialized).includes('APIKEY_IN_QUERY'),
      `the url query string leaked the API key: ${JSON.stringify(serialized)}`,
    );
  });

  it('leaves non-secret query parameters readable in the url', function () {
    const serialized = serializeRequest(
      requestWith({
        url: '/project/123/form?token=APIKEY_IN_QUERY&page=2',
        query: { token: 'APIKEY_IN_QUERY', page: '2' },
      }),
    );

    assert.ok(
      serialized.url.includes('page=2'),
      `redaction must not blank the whole url: ${serialized.url}`,
    );
  });

  it('keeps the rest of the query string when a value contains a question mark', function () {
    const serialized = serializeRequest(
      requestWith({
        url: '/project/123/form?token=APIKEY?WEIRD&page=2',
        query: { token: 'APIKEY?WEIRD', page: '2' },
      }),
    );

    assert.ok(
      serialized.url.includes('page=2'),
      `a '?' inside a value must not truncate the url: ${serialized.url}`,
    );
    assert.ok(
      !serialized.url.includes('APIKEY?WEIRD'),
      `the key must still be censored: ${serialized.url}`,
    );
  });

  it('redacts the API key regardless of the query parameter casing', function () {
    // Query parameter names are case-sensitive (unlike headers, which Node lowercases),
    // so an exact-match denylist would log ?TOKEN= in full.
    const serialized = serializeRequest(
      requestWith({
        url: '/project/123/form?TOKEN=APIKEY_IN_QUERY&page=2',
        query: { TOKEN: 'APIKEY_IN_QUERY', page: '2' },
      }),
    );

    assert.ok(
      !JSON.stringify(serialized).includes('APIKEY_IN_QUERY'),
      `an upper-cased token parameter leaked the API key: ${JSON.stringify(serialized)}`,
    );
  });

  it('redacts the freshly issued JWT from the response headers', function () {
    const { logger: log, read } = captureRecords();

    // tokenHandler.js sets this on every authenticated response, and pino-http serializes
    // res.headers onto the completion line.
    log.info({ res: { statusCode: 200, headers: { 'x-jwt-token': 'FRESH_JWT' } } }, 'completed');

    assert.ok(
      !read().includes('FRESH_JWT'),
      `the response JWT is newly issued and valid; it must not reach the log: ${read()}`,
    );
  });

  it('redacts set-cookie from the response headers', function () {
    const { logger: log, read } = captureRecords();

    log.info(
      { res: { statusCode: 200, headers: { 'set-cookie': 'session=COOKIE_SECRET; HttpOnly' } } },
      'completed',
    );

    assert.ok(!read().includes('COOKIE_SECRET'), `set-cookie leaked: ${read()}`);
  });

  it('redacts the remote deployment token from the request headers', function () {
    const { logger: log, read } = captureRecords();

    // remoteToken.js verifies this JWT (signed with remoteSecret) on incoming requests.
    log.info({ req: requestWith({ headers: { 'x-remote-token': 'REMOTE_JWT' } }) }, 'request');

    assert.ok(!read().includes('REMOTE_JWT'), `x-remote-token leaked: ${read()}`);
  });

  it('redacts the re-issued tokens from the response headers', function () {
    const { logger: log, read } = captureRecords();

    // remoteToken.js re-issues x-remote-token, hooks/settings.js sets x-m2m-token (an OAuth
    // access token) and pdfProxy forwards pdf-server's x-file-token.
    log.info(
      {
        res: {
          statusCode: 200,
          headers: {
            'x-remote-token': 'REMOTE_JWT',
            'x-m2m-token': 'M2M_ACCESS_TOKEN',
            'x-file-token': 'FILE_TOKEN',
          },
        },
      },
      'completed',
    );

    const output = read();
    assert.ok(!output.includes('REMOTE_JWT'), `x-remote-token leaked: ${output}`);
    assert.ok(!output.includes('M2M_ACCESS_TOKEN'), `x-m2m-token leaked: ${output}`);
    assert.ok(!output.includes('FILE_TOKEN'), `x-file-token leaked: ${output}`);
  });

  it('redacts a JWT or remote token passed as a query parameter', function () {
    const { logger: log, read } = captureRecords();

    // util.getRequestValue falls back from the header to req.query for the same name, so
    // ?x-jwt-token= and ?x-remote-token= are accepted auth forms.
    const query = { 'x-jwt-token': 'JWT_IN_QUERY', 'x-remote-token': 'REMOTE_IN_QUERY' };
    const url = '/project/123/form?x-jwt-token=JWT_IN_QUERY&x-remote-token=REMOTE_IN_QUERY';
    log.info({ req: serializeRequest(requestWith({ url, query })) }, 'request');

    const output = read();
    assert.ok(!output.includes('JWT_IN_QUERY'), `?x-jwt-token= leaked: ${output}`);
    assert.ok(!output.includes('REMOTE_IN_QUERY'), `?x-remote-token= leaked: ${output}`);
  });

  it('censors a percent-encoded token parameter name in the url', function () {
    // The query parser decodes %74oken to token (and apiKey.js accepts it), but the raw url
    // string still carries the encoded name.
    const serialized = serializeRequest(
      requestWith({
        url: '/project/123/form?%74oken=APIKEY_IN_QUERY&page=2',
        query: { token: 'APIKEY_IN_QUERY', page: '2' },
      }),
    );

    assert.ok(
      !JSON.stringify(serialized).includes('APIKEY_IN_QUERY'),
      `a percent-encoded token parameter leaked the API key: ${JSON.stringify(serialized)}`,
    );
  });
});

describe('Logger - error serialization', function () {
  const { Writable } = require('stream');
  const pino = require('pino');

  const captureRecords = () => {
    const lines = [];
    const stream = new Writable({
      write(chunk, encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const options = getLoggerOptions();
    delete options.transport;
    return { logger: pino(options, stream), read: () => lines.join('') };
  };

  // The shape @hapi/wreck (via simple-oauth2) throws on a non-2xx token response: the whole
  // response, and through it the outgoing request head with its Basic auth header, hangs off
  // an enumerable `data` property.
  const errorWithRequestDump = () => {
    const err = new Error('Response Error: 401 Unauthorized');
    err.code = 'E_TOKEN';
    err.data = {
      res: { req: { _header: 'POST /token HTTP/1.1\r\nAuthorization: Basic CLIENT_SECRET_B64' } },
      payload: 'access_denied',
    };
    return err;
  };

  it('keeps the type, message, stack and code of a logged error', function () {
    const { logger: log, read } = captureRecords();

    log.error({ err: errorWithRequestDump() }, 'M2M Token error');

    const record = JSON.parse(read());
    assert.strictEqual(record.err.type, 'Error');
    assert.strictEqual(record.err.message, 'Response Error: 401 Unauthorized');
    assert.strictEqual(record.err.code, 'E_TOKEN');
    assert.ok(record.err.stack.includes('Response Error'), 'stack must be preserved');
  });

  it('drops the arbitrary enumerable properties an error carries', function () {
    const { logger: log, read } = captureRecords();

    log.error({ err: errorWithRequestDump() }, 'M2M Token error');

    assert.ok(!read().includes('CLIENT_SECRET_B64'), `error payload leaked: ${read()}`);
  });

  it('applies the same error serializer to the request-scoped logger', function () {
    const { logger: log, read } = captureRecords();
    // pino-http builds req.log as `logger.child({}, opts)` with its own serializers, which
    // take precedence over the parent's.
    const requestLogger = log.child({}, { serializers: getHttpLoggerOptions().serializers });

    requestLogger.error({ err: errorWithRequestDump() }, 'M2M Token error');

    assert.ok(!read().includes('CLIENT_SECRET_B64'), `error payload leaked via req.log: ${read()}`);
  });
});

describe('Logger - legacy logger options', function () {
  const { getLegacyLoggerOptions } = require('../src/util/logger/appLogger');
  let savedDebug;

  beforeEach(function () {
    savedDebug = process.env.DEBUG;
  });

  afterEach(function () {
    restoreEnv('DEBUG', savedDebug);
  });

  it('redacts auth material in legacy mode too', function () {
    const options = getLegacyLoggerOptions();
    assert.deepStrictEqual(options.redact, getLoggerOptions().redact);
  });

  it('does not serialize debug records nobody will read when DEBUG is unset', function () {
    delete process.env.DEBUG;
    assert.strictEqual(getLegacyLoggerOptions().level, 'info');
  });

  it('lets debug records through to the namespace filter when DEBUG is set', function () {
    process.env.DEBUG = 'formio:*';
    assert.strictEqual(getLegacyLoggerOptions().level, 'trace');
  });
});

describe('Logger - legacy output keeps structured fields readable', function () {
  let output, savedLog;

  beforeEach(function () {
    output = [];
    savedLog = debug.log;
    debug.log = function (...args) {
      output.push(args.join(' '));
    };
    debug.enable('formio:x');
  });

  afterEach(function () {
    debug.log = savedLog;
    debug.disable();
  });

  it('appends the extra fields of a record to the message', function () {
    emit({ level: DEBUG, module: 'formio:x', msg: 'Sanitized data', sanitized: { port: 3000 } });
    assert.strictEqual(output.length, 1);
    assert.ok(output[0].includes('Sanitized data'), output[0]);
    assert.ok(output[0].includes('"port":3000'), `field dropped: ${output[0]}`);
  });

  it('prints the fields of a record that has no message', function () {
    emit({ level: DEBUG, module: 'formio:x', association: 'existing' });
    assert.strictEqual(output.length, 1);
    assert.ok(output[0].includes('existing'), `field dropped: ${output[0]}`);
  });

  it('does not print the request and response bindings pino-http attaches', function () {
    emit({
      level: DEBUG,
      module: 'formio:x',
      msg: 'hello',
      reqId: 'abc',
      req: { id: 'abc', headers: { 'user-agent': 'UA_STRING' } },
      res: { statusCode: 200 },
      responseTime: 12,
    });
    assert.strictEqual(output.length, 1);
    assert.ok(!output[0].includes('UA_STRING'), `request binding printed: ${output[0]}`);
    assert.ok(!output[0].includes('statusCode'), `response binding printed: ${output[0]}`);
  });
});

describe('Logger - request logger fallback', function () {
  const http = require('http');
  const net = require('net');
  const { ensureRequestLogger } = require('../src/util/logger/httpLogger');

  const fakeExchange = () => {
    const req = new http.IncomingMessage(new net.Socket());
    req.method = 'GET';
    req.url = '/form';
    const res = new http.ServerResponse(req);
    return { req, res };
  };

  it('attaches req.log when the router is mounted without the http logger', function (done) {
    // An npm consumer mounting require('formio')(config) into their own Express app never
    // mounts httpLogger; the router still has to be able to log.
    const { req, res } = fakeExchange();
    ensureRequestLogger(req, res, () => {
      assert.ok(req.log, 'req.log must be attached');
      assert.strictEqual(typeof req.log.child, 'function');
      done();
    });
  });

  it('leaves an existing req.log alone', function (done) {
    const { req, res } = fakeExchange();
    const existing = { child: () => existing };
    req.log = existing;
    ensureRequestLogger(req, res, () => {
      assert.strictEqual(req.log, existing);
      done();
    });
  });
});

describe('Logger - http logger mount order', function () {
  const fs = require('fs');
  const path = require('path');

  // Express 4 freezes the query parser into the router the first time app.use() runs, so a
  // later app.set('query parser', 'simple') is silently ignored and the extended (qs)
  // parser stays in effect.
  const assertParserSetBeforeMount = (file) => {
    const source = fs.readFileSync(file, 'utf8');
    const setIndex = source.indexOf("app.set('query parser'");
    const mountIndex = source.indexOf('app.use(httpLogger)');
    assert.ok(setIndex !== -1, `${file} must set the query parser`);
    assert.ok(mountIndex !== -1, `${file} must mount httpLogger`);
    assert.ok(
      setIndex < mountIndex,
      `${file} mounts httpLogger before setting the query parser, which disables the setting`,
    );
  };

  it('sets the simple query parser before mounting the http logger', function () {
    assertParserSetBeforeMount(path.resolve(__dirname, '../server.js'));
  });

  it('sets the simple query parser before mounting the http logger in formio-server', function () {
    const serverJs = path.resolve(__dirname, '../../formio-server/server.js');
    if (!fs.existsSync(serverJs)) {
      // The OSS repo ships without formio-server.
      this.skip();
    }
    assertParserSetBeforeMount(serverJs);
  });
});

describe('Logger - redaction lists are immutable', function () {
  const {
    REDACTED_HEADERS,
    REDACTED_QUERY_PARAMS,
    REDACT_PATHS,
  } = require('../src/util/logger/redaction');

  // These lists decide what never reaches a log. They are module exports, so anything that
  // requires the logger could otherwise splice an entry out and silently defeat redaction.
  it('cannot have a header removed from the denylist at runtime', function () {
    assert.throws(() => REDACTED_HEADERS.pop(), TypeError);
    assert.ok(REDACTED_HEADERS.includes('x-token'));
  });

  it('cannot have a query parameter removed from the denylist at runtime', function () {
    assert.throws(() => REDACTED_QUERY_PARAMS.pop(), TypeError);
    assert.ok(REDACTED_QUERY_PARAMS.includes('token'));
  });

  it('cannot have a pino redact path removed at runtime', function () {
    assert.throws(() => REDACT_PATHS.pop(), TypeError);
  });
});
