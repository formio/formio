'use strict';

const _ = require('lodash');

class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.defaultPrevented = false;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }
}
// @formio/vm injects only console.log; the renderer/validators also call
// console.warn/error/info/debug, whose absence throws mid-validation.
if (typeof console !== 'undefined') {
  console.warn = console.warn || console.log;
  console.error = console.error || console.log;
  console.info = console.info || console.log;
  console.debug = console.debug || console.log;
}

globalThis.Text = class {};
globalThis.HTMLElement = class {};
globalThis.HTMLCanvasElement = class {};
globalThis.navigator = { userAgent: '' };

globalThis.document = {
  createElement: () => ({}),
  cookie: '',
  getElementsByTagName: () => [],
  documentElement: {
    style: [],
    firstElementChild: { appendChild: () => {} },
  },
};
globalThis.window = {
  addEventListener: () => {},
  Event,
  navigator: globalThis.navigator,
};
// Pure-JS base64 — the isolate has no Buffer, and the url fetch provider calls
// btoa() to build a cache key before any network happens.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
globalThis.btoa = (input) => {
  const str = String(input);
  let out = '';
  for (let i = 0; i < str.length; ) {
    const c1 = str.charCodeAt(i++);
    const c2 = str.charCodeAt(i++);
    const c3 = str.charCodeAt(i++);
    out += B64_CHARS[c1 >> 2];
    out += B64_CHARS[((c1 & 3) << 4) | (c2 >> 4)];
    out += B64_CHARS[isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6)];
    out += B64_CHARS[isNaN(c3) ? 64 : c3 & 63];
  }
  return out;
};

// WHATWG fetch adapter: the isolate has no fetch/Headers/Response; the real
// network runs on the host (host.fetch). Response headers are preserved so the
// SDK's url fetch provider can read content-range.
globalThis.Headers = class Headers {
  constructor(init) {
    this._map = {};
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value));
      } else if (typeof init.forEach === 'function') {
        init.forEach((value, key) => this.set(key, value));
      } else {
        Object.keys(init).forEach((key) => this.set(key, init[key]));
      }
    }
  }
  set(name, value) {
    this._map[String(name).toLowerCase()] = String(value);
  }
  append(name, value) {
    this.set(name, value);
  }
  get(name) {
    const value = this._map[String(name).toLowerCase()];
    return value === undefined ? null : value;
  }
  has(name) {
    return String(name).toLowerCase() in this._map;
  }
  delete(name) {
    delete this._map[String(name).toLowerCase()];
  }
  forEach(callback) {
    Object.keys(this._map).forEach((key) => callback(this._map[key], key, this));
  }
  toJSON() {
    return { ...this._map };
  }
};

globalThis.Response = class Response {
  constructor(raw) {
    raw = raw || {};
    this.ok = !!raw.ok;
    this.status = raw.status || 0;
    this.statusText = raw.statusText || '';
    this.headers = new globalThis.Headers(raw.headers || {});
    this._body = raw.body == null ? '' : raw.body;
  }
  text() {
    return Promise.resolve(this._body);
  }
  json() {
    return Promise.resolve(JSON.parse(this._body));
  }
};

// URL/URLSearchParams are host-env globals too; the select validator and url
// fetch providers parse absolute urls and build query strings with them.
globalThis.URLSearchParams = class URLSearchParams {
  constructor(init) {
    this._pairs = [];
    if (typeof init === 'string') {
      const query = init.replace(/^\?/, '');
      if (query) {
        query.split('&').forEach((part) => {
          const eq = part.indexOf('=');
          const key = decodeURIComponent(eq < 0 ? part : part.slice(0, eq));
          const value = eq < 0 ? '' : decodeURIComponent(part.slice(eq + 1).replace(/\+/g, ' '));
          this._pairs.push([key, value]);
        });
      }
    } else if (init && typeof init.forEach === 'function') {
      init.forEach((value, key) => this._pairs.push([String(key), String(value)]));
    } else if (init) {
      Object.keys(init).forEach((key) => this._pairs.push([key, String(init[key])]));
    }
  }
  set(name, value) {
    this.delete(name);
    this._pairs.push([String(name), String(value)]);
  }
  append(name, value) {
    this._pairs.push([String(name), String(value)]);
  }
  get(name) {
    const pair = this._pairs.find(([key]) => key === name);
    return pair ? pair[1] : null;
  }
  has(name) {
    return this._pairs.some(([key]) => key === name);
  }
  delete(name) {
    this._pairs = this._pairs.filter(([key]) => key !== name);
  }
  forEach(callback) {
    this._pairs.forEach(([key, value]) => callback(value, key, this));
  }
  toString() {
    return this._pairs
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
};

globalThis.URL = class URL {
  constructor(input) {
    const match = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(
      String(input),
    );
    if (!match) {
      throw new TypeError(`Invalid URL: ${input}`);
    }
    this.protocol = match[1];
    this.host = match[2];
    this.pathname = match[3] || '/';
    this.hash = match[5] || '';
    const [hostname, port = ''] = this.host.split(':');
    this.hostname = hostname;
    this.port = port;
    this.origin = `${this.protocol}//${this.host}`;
    this.searchParams = new globalThis.URLSearchParams(match[4] || '');
  }
  get search() {
    const query = this.searchParams.toString();
    return query ? `?${query}` : '';
  }
  get href() {
    return `${this.origin}${this.pathname}${this.search}${this.hash}`;
  }
  toString() {
    return this.href;
  }
};

globalThis.fetch = (url, options) => {
  options = options || {};
  let headers = options.headers;
  if (headers && typeof headers.toJSON === 'function') {
    headers = headers.toJSON();
  } else if (headers && typeof headers.forEach === 'function') {
    const plain = {};
    headers.forEach((value, key) => {
      plain[key] = value;
    });
    headers = plain;
  }
  return globalThis.host
    .fetch(url, { method: options.method, headers, body: options.body })
    .then((raw) => new globalThis.Response(raw));
};
// No event loop in the isolate; defer timer callbacks to the microtask queue
// (so setTimeout-based yields still resolve) and make intervals inert.
globalThis.setTimeout = (cb, _ms, ...args) => {
  if (typeof cb === 'function') {
    Promise.resolve().then(() => cb(...args));
  }
  return 0;
};
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
if (typeof globalThis.queueMicrotask !== 'function') {
  globalThis.queueMicrotask = (cb) => {
    Promise.resolve().then(cb);
  };
}
// performance.now drives the renderer's cooperative-yield budget check; a fixed 0
// simply means "never over budget, never yield" — correct for a headless sweep.
if (!globalThis.performance) {
  globalThis.performance = { now: () => 0 };
}
// Components generate ids (e.g. datagrid/editgrid rows) via crypto.randomUUID.
if (!globalThis.crypto) {
  let seed = 0;
  globalThis.crypto = {
    randomUUID: () => `0000000000000000000000000000${(seed++).toString(16)}`.slice(-32),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 256;
      }
      return arr;
    },
  };
}

// structuredClone isn't a V8 builtin; the renderer's reactive store uses it to
// snapshot state. lodash cloneDeep covers the data shapes forms carry.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) => _.cloneDeep(value);
}

module.exports = { Event };
