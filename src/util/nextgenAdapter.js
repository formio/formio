'use strict';
/**
 * Data-access host callbacks for the encapsulated @formio/nextgen render. The
 * whole createHeadlessForm() render runs inside the isolate, which has no Mongo
 * or network; these callbacks run on the host (real models, real access checks)
 * and return plain JSON across the sandbox boundary. Built per request by
 * Validator.validateNextgen, closing over the request store — see buildNextgenHostCallbacks.
 */
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const util = require('./util');
const { findComponentByDataPath } = require('@formio/nextgen');
const fetch = require('@formio/node-fetch-http-proxy');

const escapeRegExCharacters = (value) => value.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// TODO: these functions are overwritten; we need to simplify these or at least take another look
// when the security tickets get merged
function deConflictQuery(query) {
  if (!query) return {};
  const opFields = new Set();
  for (const key of Object.keys(query)) {
    const i = key.indexOf('__');
    if (i > 0) opFields.add(key.slice(0, i));
  }
  const out = {};
  for (const [key, value] of Object.entries(query)) {
    if (key !== 'limit' && key !== 'skip' && !key.includes('__') && opFields.has(key)) {
      out[`${key}__in`] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function resolveFormReference(store, formId) {
  if (typeof formId !== 'string' || OBJECT_ID_PATTERN.test(formId)) return formId;
  const cache = store.router?.formio?.cache;
  if (!cache?.loadFormByAlias || !store.req) return formId;
  try {
    const form = await cache.loadFormByAlias(store.req, formId);
    return form && form._id ? form._id.toString() : formId;
  } catch (ignoreErr) {
    return formId;
  }
}

async function dispatchSubmissionGet(store, formId, query) {
  const getHandler = store.router?.resourcejs?.['/form/:formId/submission']?.get;
  if (!getHandler) {
    throw new Error(
      'nextgenAdapter: submission access requires the server router (resourcejs GET handler)',
    );
  }
  formId = await resolveFormReference(store, formId);
  return new Promise((resolve, reject) => {
    const sub = {};
    const respond = (payload) => {
      const code = sub.res.statusCode;
      // Access denial / not-found resolves to no referenced data (the caller
      // then keeps just the `{_id}`), mirroring classic's reference reduction.
      if (code === 401 || code === 403 || code === 404) return resolve([]);
      if (!code || code < 300 || code === 416) {
        return resolve(sub.res.resource ? sub.res.resource.item : []);
      }
      const detail =
        payload && typeof payload === 'object'
          ? payload.message || JSON.stringify(payload)
          : payload;
      return reject(new Error(`Submission load failed: ${code}${detail ? ` ${detail}` : ''}`));
    };
    sub.req = util.createSubRequest(store.req);
    if (!sub.req) return reject(new Error('Too many recursive requests.'));
    sub.req.noResponse = true;
    sub.req.doNotMinify = true;
    sub.req.formId = sub.req.params.formId = formId;
    _.unset(sub.req.params, 'submissionId');
    // The parent POST granted itself `create_all` (skipOwnerFilter=true) and
    // createSubRequest clones that; reset it so this read is owner-scoped.
    sub.req.skipOwnerFilter = false;
    // A load targeting a specific submission `_id` must be dispatched as a
    // per-submission read (`subId` set), so permissionHandler evaluates
    // submission-level access (owner / submissionAccess) rather than form-level
    // read — an index read would be allowed for any resource-readable role and
    // skip owner scoping. This mirrors loadComponentValueReferences.
    if (query && query._id) {
      sub.req.subId = query._id;
    } else {
      delete sub.req.subId;
    }
    sub.req.url = '/form/:formId/submission';
    sub.req.query = deConflictQuery(query);
    sub.req.method = 'GET';
    sub.res = util.createSubResponse(respond);
    getHandler.call(null, sub.req, sub.res, respond);
  });
}

// Make a Mongo doc safe to cross the structured-clone boundary into the isolate
// WITHOUT the lossiness of JSON.parse(JSON.stringify(...)): ObjectIds become
// strings (a live ObjectId clones to unusable BinData — gotcha vm-boundary-bson-01),
// but Dates are preserved as Date objects (isolated-vm's structured clone carries
// them intact, matching what the host-side render saw before). Mongoose docs are
// flattened via toObject; the walk assumes acyclic docs (resourcejs lean items).
function toBoundarySafe(value) {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (value instanceof ObjectId || value._bsontype === 'ObjectId') return value.toString();
  if (Array.isArray(value)) return value.map(toBoundarySafe);
  const plain = typeof value.toObject === 'function' ? value.toObject() : value;
  const out = {};
  for (const key of Object.keys(plain)) {
    out[key] = toBoundarySafe(plain[key]);
  }
  return out;
}

// Access-checked form load (mirrors the old prototype loadForm, store-explicit).
async function loadFormWithAccess(store, formId) {
  if (!store || !formId) {
    throw new Error('nextgenAdapter.loadForm: missing store or formId');
  }
  const router = store.router;
  const permissionHandler = router?.formio?.middleware?.permissionHandler;
  const cache = router?.formio?.cache;
  if (!permissionHandler || !cache) {
    throw new Error('nextgenAdapter.loadForm: server router unavailable for access check');
  }
  const sub = { req: util.createSubRequest(store.req), res: null };
  if (!sub.req) throw new Error('Too many recursive requests.');
  sub.req.method = 'GET';
  sub.req.formId = sub.req.params.formId = formId;
  sub.req.url = '/form/:formId';
  const allowed = await new Promise((resolve) => {
    sub.res = util.createSubResponse(() => resolve(false));
    permissionHandler(sub.req, sub.res, (err) => resolve(!err));
  });
  if (!allowed) {
    throw new Error(`nextgenAdapter.loadForm: access denied for form ${formId}`);
  }
  const form = await cache.loadForm(sub.req, null, formId);
  if (!form) {
    throw new Error(`nextgenAdapter.loadForm: form ${formId} not found`);
  }
  return form;
}

// Host-side transport for url-dataSrc components (Select/Radio/SelectBoxes/
// DataSource): the isolate has no fetch, so the SDK's Formio.request is routed
// here. Injects the request JWT and normalizes relative URLs, mirroring the SDK.
async function hostRequest(store, url, method, data, header) {
  if (!url) return null;
  method = (method || 'GET').toUpperCase();
  if (url[0] === '/') {
    url = ((store.config && store.config.baseUrl) || '') + url;
  }
  const headers = {
    Accept: 'application/json',
    'Content-type': 'application/json',
    ...(header || {}),
  };
  if (store.token && !headers['x-jwt-token']) {
    headers['x-jwt-token'] = store.token;
  }
  const options = { method, headers };
  if (data) {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new Error(
      typeof body === 'string'
        ? body
        : (body && body.message) || `Request failed: ${response.status}`,
    );
  }
  return body;
}

// Host-side raw fetch for the SDK's url fetch provider (DataSource/DataTable):
// the isolate's fetch shim routes here so the real network (and, in tests, the
// nock interceptor) runs on the host. Returns a plain, boundary-safe response
// with headers preserved (the provider reads content-range for pagination).
async function hostFetch(url, options) {
  options = options || {};
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    ...(options.body != null ? { body: options.body } : {}),
  });
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers,
    body: await response.text(),
  };
}

/**
 * Build the request-scoped host callbacks the encapsulated render reaches as
 * `host.<name>(...)`. Each closes over `store` (req, models, router, config,
 * token) and returns boundary-safe JSON. Access control is preserved: these run
 * the same resourcejs/permissionHandler path the server uses — the sandbox never
 * touches Mongo directly.
 */
function buildNextgenHostCallbacks(store) {
  return {
    async loadForm(formId) {
      return toBoundarySafe(await loadFormWithAccess(store, formId));
    },
    async loadSubmission(formId, submissionId) {
      if (!formId || !submissionId) {
        throw new Error('nextgenAdapter.loadSubmission: missing formId or submissionId');
      }
      const items = await dispatchSubmissionGet(store, formId, { _id: submissionId, limit: 1 });
      const item = Array.isArray(items) ? items[0] : items;
      if (!item) {
        throw new Error(
          `nextgenAdapter.loadSubmission: submission ${submissionId} not found or inaccessible`,
        );
      }
      return toBoundarySafe(item);
    },
    async loadSubmissions(formId, query) {
      if (!formId) return [];
      const items = await dispatchSubmissionGet(store, formId, query || {});
      const list = Array.isArray(items) ? items : items ? [items] : [];
      return toBoundarySafe(list);
    },
    async checkUnique(dataPath, value, excludeId) {
      const { submissionModel, currentForm, submission, config, formioUtil } = store;
      if (!submissionModel || !currentForm) return true;
      return runIsUniqueQuery({
        submissionModel,
        currentForm,
        submission,
        config,
        formioUtil,
        dataPath,
        value,
        excludeId,
      });
    },
    async request(url, method, data, header) {
      return hostRequest(store, url, method, data, header);
    },
    async fetch(url, options) {
      return hostFetch(url, options);
    },
  };
}

/**
 * Port of Validator.isUnique (apps/formio/src/resources/Validator.js:93-178).
 * Materially unchanged — pulled out of `this` so it can run from a patched
 * SDK method. Looks up the component definition from currentForm via dataPath
 * (since the patched checkUnique signature only carries the path, not the
 * component schema).
 */
async function runIsUniqueQuery({
  submissionModel,
  currentForm,
  submission,
  config,
  formioUtil,
  dataPath,
  value,
  excludeId,
}) {
  const component = await findComponentByDataPath(
    currentForm.components,
    dataPath,
    submission && submission.data,
  );
  if (!component) return true;

  value = _.cloneDeep(value);
  const path = `data.${dataPath}`;
  const query = { form: currentForm._id };
  let collationOptions = {};
  if (formioUtil && typeof formioUtil.transformIdsToObjectIds === 'function') {
    formioUtil.transformIdsToObjectIds(value);
  }

  if (_.isString(value)) {
    if (component.dbIndex) {
      addPathQueryParams(value, query, path);
    } else if (
      (component.type === 'email' ||
        (component.type === 'textfield' &&
          component.validate &&
          component.validate.pattern === '[A-Za-z0-9]+')) &&
      config &&
      config.mongoFeatures &&
      config.mongoFeatures.collation
    ) {
      addPathQueryParams(value, query, path);
      collationOptions = { collation: { locale: 'en', strength: 2 } };
    } else {
      addPathQueryParams(
        {
          $regex: new RegExp(`^${escapeRegExCharacters(value)}$`),
          $options: 'i',
        },
        query,
        path,
      );
    }
  }
  // FOR-213 — pluck the unique location id
  else if (
    _.isPlainObject(value) &&
    value.address &&
    value.address['address_components'] &&
    value.address['place_id']
  ) {
    addPathQueryParams(
      {
        $regex: new RegExp(`^${escapeRegExCharacters(value.address['place_id'])}$`),
        $options: 'i',
      },
      query,
      `${path}.address.place_id`,
    );
  } else if (_.isArray(value)) {
    addPathQueryParams({ $all: value }, query, path);
  } else if (_.isObject(value) || _.isNumber(value)) {
    addPathQueryParams({ $eq: value }, query, path);
  }

  query.deleted = { $eq: null };
  if (submission && Object.prototype.hasOwnProperty.call(submission, 'state')) {
    query.state = 'submitted';
  }

  try {
    const result = await submissionModel.findOne(query, null, collationOptions);
    if (!result) return true;
    if (excludeId && result._id.toString() === String(excludeId)) return true;
    component.conflictId = result._id.toString();
    return false;
  } catch {
    return false;
  }
}

/**
 * Port of Validator.addPathQueryParams.
 */
function addPathQueryParams(pathQueryParams, query, path) {
  const pathArray = path.split(/\[\d+\]?./);
  const needValuesInArray = pathArray.length > 1;
  let pathToValue = path;
  if (needValuesInArray) {
    pathToValue = pathArray.shift();
    const pathQueryObj = {};
    _.reduce(
      pathArray,
      (pathQueryPath, pathPart, index) => {
        const isLastPathPart = index === pathArray.length - 1;
        const obj = _.get(pathQueryObj, pathQueryPath, pathQueryObj);
        const addedPath = `$elemMatch['${pathPart}']`;
        _.set(obj, addedPath, isLastPathPart ? pathQueryParams : {});
        return pathQueryPath ? `${pathQueryPath}.${addedPath}` : addedPath;
      },
      '',
    );
    query[pathToValue] = pathQueryObj;
  } else {
    query[pathToValue] = pathQueryParams;
  }
}

/**
 * Translate a Form.io URL-style query object (used by `loadSubmissions`)
 * into a Mongoose `.find()` query against the submissions collection.
 * Pagination keys are stripped — `limit` is applied by the caller.
 *
 * Operator-suffixed filter keys (`field__ne`, `field__gt`, …) are translated
 * via resourcejs's `getFindQuery` — the same helper classic's
 * Validator.validateResourceSelectValue uses — and combined with the exact-match
 * keys through `$and` (so a value match and a filter on the same field don't
 * collide). `submissionResource` is the resourcejs Resource for submissions;
 * absent it, operator keys fall back to literal matching.
 */
function translateQueryParams(query, formId, submissionResource) {
  const mongoQuery = {
    form: new ObjectId(String(formId)),
    deleted: null,
    $or: [{ state: 'submitted' }, { state: { $exists: false } }],
  };
  if (!query) return mongoQuery;
  const filterParams = {};
  for (const [key, val] of Object.entries(query)) {
    if (key === 'limit' || key === 'skip') continue;
    if (key === '_id') {
      mongoQuery._id = ObjectId.isValid(String(val)) ? new ObjectId(String(val)) : val;
    } else if (key.includes('__')) {
      filterParams[key] = val;
    } else {
      mongoQuery[key] = val;
    }
  }
  const filterKeys = Object.keys(filterParams);
  if (filterKeys.length) {
    if (!submissionResource) {
      // Operator filters need resourcejs's query translator; without it we
      // can't build a correct query. Warn rather than silently mis-match
      // (a literal `field__ne` key would match nothing).
      console.warn(
        'nextgenAdapter: cannot translate operator filter(s) without a submissionResource:',
        filterKeys,
      );
    } else {
      const find = submissionResource.getFindQuery({ query: filterParams });
      if (find && Object.keys(find).length) {
        mongoQuery.$and = [...(mongoQuery.$and || []), find];
      }
    }
  }
  return mongoQuery;
}

function registerNextgenEvaluator(vmOptions, hook) {
  const { registerEvaluator } = require('@formio/nextgen');
  const { NextgenIsolateEvaluator } = require('../vm/nextgen/NextgenIsolateEvaluator');
  registerEvaluator(new NextgenIsolateEvaluator(vmOptions, hook));
}

module.exports = {
  buildNextgenHostCallbacks,
  registerNextgenEvaluator,
  // exported for unit tests
  toBoundarySafe,
  runIsUniqueQuery,
  translateQueryParams,
  addPathQueryParams,
  resolveFormReference,
};
