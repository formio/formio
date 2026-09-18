'use strict';

const { randomUUID } = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('./appLogger');
const { stripSecretsFromUrl, stripSecretsFromQuery, serializeError } = require('./redaction');

// Receives the request already normalized by pino-http's standard serializer. The headers
// are censored downstream by pino's `redact`; the query is censored here as well as there,
// so nothing leaves this function still carrying the key.
const serializeRequest = (req) => ({
  ...req,
  url: stripSecretsFromUrl(req.url),
  query: stripSecretsFromQuery(req.query),
});

// GOTCHA(G-FOS05)
// The per-request "request completed" lines are new with the pino migration -- they had no
// `debug` predecessor -- so they stay off until the STRUCTURED_LOGGING flag is on. The
// middleware is always mounted regardless: `req.log` is what every call site logs through.
//
// pino-http builds `req.log` as a child with these serializers, which take precedence over
// the app logger's -- so the error serializer has to be named here as well.
const getHttpLoggerOptions = () => ({
  logger,
  genReqId: (req) => req.id || randomUUID(),
  autoLogging: logger.isStructuredLoggingEnabled(),
  serializers: { req: serializeRequest, err: serializeError },
});

const httpLogger = pinoHttp(getHttpLoggerOptions());

// The router (this package's npm entry point) logs through `req.log` on every request, but
// only `server.js` mounts `httpLogger`. An embedder mounting the router into their own
// Express app never does, so the router attaches the request logger itself when nothing
// upstream has.
const ensureRequestLogger = (req, res, next) => {
  if (req.log) {
    return next();
  }
  return httpLogger(req, res, next);
};

module.exports = httpLogger;
module.exports.getHttpLoggerOptions = getHttpLoggerOptions;
module.exports.serializeRequest = serializeRequest;
module.exports.ensureRequestLogger = ensureRequestLogger;
