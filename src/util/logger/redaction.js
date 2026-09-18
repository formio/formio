'use strict';

const pino = require('pino');

// Auth material that must never reach a log record. `pino-http` binds the whole request
// onto `req.log`, so without this every request-scoped line carries these in full.
// `x-token` (project API key) and `x-admin-key` (server-wide admin) are the critical two:
// unlike a JWT they do not expire, so a leaked value is a standing admin credential.
//
// This is a DENYLIST -- a header not named here is logged verbatim. Add any new auth
// header in the same PR that introduces it. Frozen: these lists govern what never reaches
// a log, so no consumer of this module gets to quietly splice an entry out at runtime.
const REDACTED_HEADERS = Object.freeze([
  'x-token',
  'x-admin-key',
  'x-jwt-token',
  // the remote-deployment JWT (formio-server remoteToken.js), signed with remoteSecret
  'x-remote-token',
  // pdf-server's file access token, persisted as the project's `filetoken` setting
  'x-file-token',
  'authorization',
  'cookie',
]);

// The response side leaks too: `pino-http` serializes `res.headers` onto the completion
// line, and `tokenHandler.js` sets a freshly issued -- so maximally useful -- JWT on every
// authenticated response. remoteToken.js re-issues `x-remote-token` the same way, the M2M
// hook sets the OAuth access token as `x-m2m-token`, and pdfProxy forwards `x-file-token`.
const REDACTED_RESPONSE_HEADERS = Object.freeze([
  'x-jwt-token',
  'x-remote-token',
  'x-m2m-token',
  'x-file-token',
  'set-cookie',
]);

// The project API key is also accepted as `?token=` when the header is absent
// (apps/formio-server/src/middleware/apiKey.js), and `util.getRequestValue` falls back from
// a header to the query parameter of the same name, so the JWT and the remote token travel
// as `?x-jwt-token=` / `?x-remote-token=` too.
const REDACTED_QUERY_PARAMS = Object.freeze(['token', 'x-jwt-token', 'x-remote-token']);

const REDACTION_CENSOR = '[REDACTED]';

// Consumed as pino's `redact.paths`. Names need the bracket form because pino reads a dot
// as a path separator and the names contain dashes.
const REDACT_PATHS = Object.freeze([
  ...REDACTED_HEADERS.map((header) => `req.headers["${header}"]`),
  ...REDACTED_RESPONSE_HEADERS.map((header) => `res.headers["${header}"]`),
  ...REDACTED_QUERY_PARAMS.map((param) => `req.query["${param}"]`),
]);

// Case-insensitive: query parameter names are case-sensitive on the wire (unlike headers,
// which Node lowercases for us), so an exact match would let `?TOKEN=` through carrying a
// real key.
const isSecretQueryParam = (name) => REDACTED_QUERY_PARAMS.includes(name.toLowerCase());

// The query parser percent-decodes names (`%74oken` is accepted as `token`), so compare the
// decoded name -- but leave the raw one in the output so the url stays recognisable.
const decodeQueryName = (name) => {
  try {
    return decodeURIComponent(name);
  } catch (ignore) {
    return name;
  }
};

const censorQueryPair = (pair) => {
  const [name] = pair.split('=');
  return isSecretQueryParam(decodeQueryName(name)) ? `${name}=${REDACTION_CENSOR}` : pair;
};

// Censoring `req.query` alone is not enough: the serialized `url` keeps its raw query
// string, so the API key would leak a second time through that field.
const stripSecretsFromUrl = (url) => {
  // Split on the FIRST '?' only -- a '?' is legal inside a query value, and splitting on
  // every one of them would drop the tail of the url.
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return url;
  }
  const path = url.slice(0, queryStart);
  const queryString = url.slice(queryStart + 1);
  return `${path}?${queryString.split('&').map(censorQueryPair).join('&')}`;
};

const stripSecretsFromQuery = (query) => {
  const scrubbed = { ...query };
  for (const name of Object.keys(scrubbed)) {
    if (isSecretQueryParam(name)) {
      scrubbed[name] = REDACTION_CENSOR;
    }
  }
  return scrubbed;
};

// pino's default error serializer copies every enumerable own property of the error onto
// the record. HTTP client libraries hang the whole exchange off one of those (`@hapi/wreck`
// puts the response -- and through it the outgoing request head with its Authorization
// header -- on `err.data`), and mongoose validation errors carry the submitted value. Keep
// only what identifies the failure.
const serializeError = (err) => {
  const { type, message, stack, code } = pino.stdSerializers.err(err);
  const serialized = { type, message, stack };
  if (code !== undefined) {
    serialized.code = code;
  }
  return serialized;
};

module.exports = {
  REDACTED_HEADERS,
  REDACTED_RESPONSE_HEADERS,
  REDACTED_QUERY_PARAMS,
  REDACTION_CENSOR,
  REDACT_PATHS,
  stripSecretsFromUrl,
  stripSecretsFromQuery,
  serializeError,
};
