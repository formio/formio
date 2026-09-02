'use strict';
const fs = require('fs');
const path = require('path');
const { IsolateVM } = require('@formio/vm');

const NEXTGEN_RENDER_BUNDLE = fs.readFileSync(
  path.resolve(__dirname, '../bundles/nextgen-render.js'),
  'utf8',
);

// Runs INSIDE the isolate: wire the data-access client to host callbacks, run the
// whole headless render, return plain structured-cloneable output.
const RENDER_CODE = `
  (async () => {
    Object.assign(Formio.prototype, {
      loadForm: function () { return host.loadForm(this.formId); },
      loadSubmission: function () { return host.loadSubmission(this.formId, this.submissionId); },
      loadSubmissions: function (query) {
        return host.loadSubmissions(this.formId, snapshot(query));
      },
      checkUnique: function (dataPath, value, excludeId) {
        return host.checkUnique(dataPath, snapshot(value), excludeId);
      },
      makeRequest: function (_type, url, method, body) {
        return host.request(url, method, snapshot(body));
      },
    });
    Formio.makeRequest = function (_formio, _type, url, method, body) {
      return host.request(url, method, snapshot(body));
    };
    Formio.request = function (url, method, body) {
      return host.request(url, method, snapshot(body));
    };

    const formio = new Formio(baseUrl + '/form/' + form._id);
    const instance = await createHeadlessForm(form, submission, {
      formio: formio,
      headless: true,
      applyDefaults: applyDefaults,
      serverHeaders: serverHeaders,
    });
    if (instance && instance.ready) { await instance.ready; }
    if (instance && instance.settled) { await instance.settled; }

    // snapshot unwraps createStore proxies (incl. nested error-context
    // values) into a structured-cloneable payload; a raw proxy fails to clone.
    return snapshot({
      data: instance.data,
      details: errorsRecordToDetails(instance),
      hiddenPaths: collectHiddenPaths(instance),
      protectedPaths: getProtectedPaths(instance),
    });
  })()
`;

// Same isolate renderer, email output: render the form in readOnly html mode and
// collect the email render data. The whole render runs in-isolate — email form JS
// never executes on the host.
const EMAIL_RENDER_CODE = `
  (async () => {
    Object.assign(Formio.prototype, {
      loadForm: function () { return host.loadForm(this.formId); },
      loadSubmission: function () { return host.loadSubmission(this.formId, this.submissionId); },
      loadSubmissions: function (query) {
        return host.loadSubmissions(this.formId, snapshot(query));
      },
      checkUnique: function (dataPath, value, excludeId) {
        return host.checkUnique(dataPath, snapshot(value), excludeId);
      },
      makeRequest: function (_type, url, method, body) {
        return host.request(url, method, snapshot(body));
      },
    });
    Formio.makeRequest = function (_formio, _type, url, method, body) {
      return host.request(url, method, snapshot(body));
    };
    Formio.request = function (url, method, body) {
      return host.request(url, method, snapshot(body));
    };

    const metadata = submission.metadata || {};
    const formio = new Formio(baseUrl + '/form/' + form._id);
    const instance = await createHeadlessForm(form, submission, {
      formio: formio,
      headless: true,
      readOnly: true,
      renderMode: 'html',
      submissionTimezone: metadata.timezone,
      language: metadata.language,
    });
    if (instance && instance.ready) { await instance.ready; }
    if (instance && instance.settled) { await instance.settled; }

    return snapshot(collectEmailRenderData(instance));
  })()
`;

/**
 * Owns a POOL of pre-scaffolded nextgen render isolates (default 1). The ~4.5MB
 * env bundle compiles once per isolate; each request renders in a fresh context
 * with its own host callbacks. One isolate runs one thread of JS, so `poolSize`
 * isolates give ~poolSize× throughput on a multi-core box; `maxConcurrent` is the
 * PER-isolate live-render cap that bounds each isolate's memory (GC) footprint.
 */
class NextgenIsolateRenderer {
  constructor(options = {}) {
    this.vmOptions = { env: NEXTGEN_RENDER_BUNDLE };
    if (options.memoryLimitMb) {
      this.vmOptions.memoryLimitMb = options.memoryLimitMb;
    }
    if (options.timeoutMs) {
      this.vmOptions.timeoutMs = options.timeoutMs;
    }
    this.baseUrl = options.baseUrl || 'http://localhost';
    this.perIsolateConcurrency = options.maxConcurrent > 0 ? options.maxConcurrent : 8;
    const poolSize = options.poolSize > 0 ? options.poolSize : 1;
    this.workers = Array.from({ length: poolSize }, () => ({
      vm: new IsolateVM(this.vmOptions),
      active: 0,
    }));
    this.waiters = [];
  }

  // Least-loaded worker under its per-isolate cap; otherwise park until a slot frees.
  acquire() {
    let picked = null;
    for (const worker of this.workers) {
      if (
        worker.active < this.perIsolateConcurrency &&
        (picked === null || worker.active < picked.active)
      ) {
        picked = worker;
      }
    }
    if (picked) {
      picked.active++;
      return Promise.resolve(picked);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  release(worker) {
    const next = this.waiters.shift();
    if (next) {
      next(worker);
    } else {
      worker.active--;
    }
  }

  /**
   * Render + validate a submission entirely inside an isolate.
   *
   * @param {Object} params
   * @param {Object} params.form - Plain (JSON-safe) form definition.
   * @param {Object} params.submission - Plain (JSON-safe) submission.
   * @param {boolean} params.applyDefaults - Apply component defaults (POST only).
   * @param {Object} params.serverHeaders - Request headers for forwardHeaders datasources.
   * @param {Object} params.callbacks - Request-scoped host callbacks (loadForm,
   *   loadSubmission, loadSubmissions, checkUnique, request) returning plain JSON.
   * @returns {Promise<{data, details, hiddenPaths, protectedPaths}>}
   */
  async renderProcess(params) {
    const worker = await this.acquire();
    try {
      return await this.evaluate(worker, params);
    } catch (err) {
      // A fatal render disposes that isolate; rebuild just it and retry once so
      // one bad render can't permanently kill a pool slot (renders have no side effects).
      if (isDisposedError(err)) {
        worker.vm = new IsolateVM(this.vmOptions);
        return await this.evaluate(worker, params);
      }
      throw err;
    } finally {
      this.release(worker);
    }
  }

  async renderEmail(params) {
    const worker = await this.acquire();
    try {
      return await this.evaluateEmail(worker, params);
    } catch (err) {
      if (isDisposedError(err)) {
        worker.vm = new IsolateVM(this.vmOptions);
        return await this.evaluateEmail(worker, params);
      }
      throw err;
    } finally {
      this.release(worker);
    }
  }

  evaluateEmail(worker, { form, submission, callbacks }) {
    return worker.vm.evaluate(
      EMAIL_RENDER_CODE,
      {
        form,
        submission,
        baseUrl: this.baseUrl,
      },
      { promise: true, hostCallbacks: callbacks },
    );
  }

  evaluate(worker, { form, submission, applyDefaults, serverHeaders, callbacks }) {
    return worker.vm.evaluate(
      RENDER_CODE,
      {
        form,
        submission,
        applyDefaults: !!applyDefaults,
        serverHeaders: serverHeaders || {},
        baseUrl: this.baseUrl,
      },
      { promise: true, hostCallbacks: callbacks },
    );
  }

  dispose() {
    for (const worker of this.workers) {
      worker.vm.dispose();
    }
  }
}

function isDisposedError(err) {
  return /disposed|not initialized/i.test((err && err.message) || '');
}

module.exports = { NextgenIsolateRenderer };
