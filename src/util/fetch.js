'use strict';

const {Agent} = require('https');
const {parse} = require('url');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const AbortController = require('abort-controller');
const _ = require('lodash');

/**
 * Parses a value to a UrlWithStringQuery object
 *
 * @param {any} value The value to be parsed
 * @returns {UrlWithStringQuery} The parsed url
 */
function parseUrl(value) {
  try {
    if (value && value.href) {
      return parse(value.href);
    }
    return parse(value);
  }
 catch (err) {
    return parse('');
  }
}

/**
 * The server HTTP proxy configuration.
 *
 * @type {UrlWithStringQuery}
 */
const httpProxy = parseUrl(process.env.http_proxy || process.env.HTTP_PROXY);

/**
 * The server HTTPS proxy configuration.
 *
 * @type {UrlWithStringQuery}
 */
const httpsProxy = parseUrl(process.env.https_proxy || process.env.HTTPS_PROXY);

/**
 * The server no proxy domain list.
 *
 * @type {string[]}
 */
const noProxyDomains = (process.env.no_proxy || process.env.NO_PROXY || '')
  .split(',')
  .map((domain) => domain.trim())
  .filter((domain) => !!domain);

/**
 * Checks wether a url should be excluded from proxying or not depending on the server configuration.
 *
 * @param {any} url The url to check.
 * @returns {boolean} Wether the url should be excluded from proxying or not.
 */
function noProxy(url) {
  const {protocol, hostname, host} = parseUrl(url);
  // If invalid url, just return true
  if (!protocol || !host || !hostname) {
    return true;
  }
  if (protocol === 'http:' && httpProxy.host === null) {
    return true;
  }
  if (protocol === 'https:' && httpsProxy.host === null) {
    return true;
  }
  return noProxyDomains.some(
    (domain) => (host.endsWith(domain) || hostname.endsWith(domain))
  );
}

module.exports = (url, options = {}) => {
  // Parse the request input information
  const input = parseUrl(url);

  let {rejectUnauthorized} = options;

  // Check that the target url is a valid URL
  if (!input.host) {
    return Promise.reject(new TypeError('Only absolute URLs are supported'));
  }

  // Convert timeout into abort controller;
  let keepAlive = () => {};
  if (options.timeout) {
    const ctrl = new AbortController();
    keepAlive = _.debounce(() => {
      ctrl.abort();
    }, options.timeout);
    options.signal = ctrl.signal;
    delete options.timeout;
    // Start the timer
    keepAlive();
  }

  let qs = '';
  if (options.qs) {
    qs = Object.keys(options.qs).reduce((str, q) => `${str}${(str ? '&' : '?')}${q}=${options.qs[q]}`, '');
  }

  // Shallow clone the request init options
  const init = Object.assign({}, options);

  // Check if using HTTPS
  const isHTTPS = input.protocol === 'https:';

  if (typeof rejectUnauthorized === 'undefined') {
     // Check if system is forcing invalid tls rejection (should be rejected by default)
    rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
  }

  // Check if we need to use http(s) proxy or not
  if (!noProxy(input)) {
    // Set up the http(s) proxy agent
    init.agent = new HttpsProxyAgent({
      ...(isHTTPS ? httpsProxy : httpProxy),
      rejectUnauthorized,
    });
  }
  else if (isHTTPS) {
    // Set up the https agent if no proxy and https
    options.agent = new Agent({
      rejectUnauthorized,
    });
  }

  return fetch(`${url}${qs}`, init)
    .then((response) => {
      if (response.ok) {
        response.body.on('data', keepAlive);
      }
      return response;
    });
};
