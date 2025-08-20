'use strict';

const ResourceFactory = require('resourcejs');
const Resource = ResourceFactory.Resource;
const _ = require('lodash');
const util = require('../util/util');
const Validator = require('./Validator');

/**
 * Utility to recursively find all unique fields in a form definition
 */
function getUniqueFieldsFromForm(form) {
  const uniqueFields = [];
  util.FormioUtils.eachComponent(form.components, function(component) {
    if (component.unique && component.key) {
      uniqueFields.push(component.key);
    }
  });

  return uniqueFields;
}

/**
 * Performs bulk validation and uniqueness checks for an array of submission docs.
 *
 * For each document, this function:
 *   - Checks for in-memory uniqueness violations within the submitted batch for all unique fields
 *   - Runs validation using the Validator
 *   - Checks for uniqueness violations against the database for all unique fields
 *
 * Returns an array of results, each with:
 *   - valid: boolean, true if the doc passes all checks
 *   - errors: array of error objects ({ type: 'unique' | 'validator', message })
 *   - doc: the original submission document
 *   - originalIndex: the index of the doc in the input array
 */
async function validateAndCheckUniquenessForSubmission({form, docs, req, formio}) {
  const duplicateValueErrorMessage = 'Duplicate value for unique field';
  const uniqueFields = getUniqueFieldsFromForm(form);

  // Generate unique fields map for checking uniqueness within the submitted batch
  const seenMaps = {};
  uniqueFields.forEach((field) => {
    seenMaps[field] = new Map();
  });

  // Track duplicate pairs: { field, firstIdx, dupIdx, msg }
  const duplicatePairs = [];

  // Collect validation and in-memory uniqueness errors in one pass
  const results = await Promise.all(
    docs.map(async (doc, idx) => {
      const errors = [];
      // In-memory uniqueness check for each unique field
      uniqueFields.forEach((field) => {
        const value = _.get(doc.data, field);
        if (value !== undefined && value !== null) {
          if (seenMaps[field].has(value)) {
            const msg = `${duplicateValueErrorMessage} ${field}`;
            errors.push({type: 'unique', message: msg});
            // Record for later: add same error to first occurrence
            duplicatePairs.push({field, firstIdx: seenMaps[field].get(value), dupIdx: idx, msg});
          }
 else {
            seenMaps[field].set(value, idx);
          }
        }
      });
      // Run the validator
      const submissionRequest = {
        ...req,
        headers: req.headers || {},
        body: doc,
        submission: _.cloneDeep(doc),
        currentForm: form,
        noValidate: req.noValidate || false,
      };
      const validator = new Validator(submissionRequest, formio);
      validator.form = form;
      validator.options = {abortEarly: false};
      const originalId = doc.data._id; // Save before validation
      await new Promise((resolve) => {
        validator.validate(submissionRequest.body, (err) => {
          if (err) {
            const details = Array.isArray(err.details)
              ? err.details
              : [{message: err.message || err, level: 'error', path: []}];

            details.forEach((e) => errors.push({type: 'validator', message: e.message || e}));
          }
          resolve();
        });
      });
      // Restore _id for upsert uniqueness check
      if (req.method && req.method.toUpperCase() === 'PUT' && doc.data && doc.data._id === undefined && originalId) {
        doc.data._id = originalId;
      }
      return {
        valid: errors.length === 0,
        errors,
        doc,
        originalIndex: doc.originalIndex,
      };
    })
  );

  // After results are built, add duplicate errors to the first occurrence
  duplicatePairs.forEach(({firstIdx, msg}) => {
    if (!results[firstIdx].errors.find((e) => e.type === 'unique' && e.message === msg)) {
      results[firstIdx].errors.push({type: 'unique', message: msg});
      results[firstIdx].valid = false;
    }
  });

  // DB uniqueness check for all unique fields
  for (const field of uniqueFields) {
    const valuesToCheck = Array.from(seenMaps[field].keys());
    if (valuesToCheck.length > 0) {
      const query = {form: form._id, [`data.${field}`]: {$in: valuesToCheck}};
      const existing = await formio.resources.submission.model.find(query, {[`data.${field}`]: 1}).lean();
      const existingValues = new Set(existing.map((s) => _.get(s.data, field)));
      results.forEach((result) => {
        const value = _.get(result.doc.data, field);
        const isUpsert = req && req.method && req.method.toUpperCase() === 'PUT';
        if (existingValues.has(value)) {
          // Find all matching DB docs
          const dbDocs = existing.filter((s) => _.get(s.data, field) === value);
          let updatingSelf = false;
          if (isUpsert && result.doc.data && result.doc.data._id) {
            const payloadId = String(result.doc.data._id);
            updatingSelf = dbDocs.some((dbDoc) => dbDoc._id && String(dbDoc._id) === payloadId);
          }
          // Only error if NOT updating self (i.e., none of the DB docs match this _id)
          if (!updatingSelf) {
            const msg = `${duplicateValueErrorMessage} ${field}`;
            if (!result.errors.find((e) => e.type === 'unique' && e.message === msg)) {
              result.errors.push({type: 'unique', message: msg});
              result.valid = false;
            }
          }
        }
      });
    }
  }
  return results;
}

module.exports = (router) => {
  const hook = require('../util/hook')(router.formio);
  const handlers = router.formio.middleware.submissionHandler;
  const hiddenFields = ['deleted', '__v', 'machineName'];

  // Manually update the handlers, to add additional middleware.
  handlers.beforePost = [
    router.formio.middleware.filterIdCreate,
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.allowTimestampOverride,
    router.formio.middleware.bootstrapEntityOwner,
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.addSubmissionResourceAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    handlers.beforePost,
  ];
  handlers.afterPost = [
    handlers.afterPost,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('create', (req) => router.formio.cache.getCurrentFormId(req)),
  ];
  handlers.beforeGet = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeGet,
  ];
  handlers.afterGet = [
    handlers.afterGet,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('get', (req) => router.formio.cache.getCurrentFormId(req)),
    async (req, res, next) => {
      try {
        const currentForm = await router.formio.cache.loadCurrentForm(req);
        await hook.alter('getSubmissionRevisionModel', router.formio, req, currentForm, false);
        return next();
      }
 catch (err) {
        return next(err);
      }
    },
    router.formio.middleware.submissionRevisionLoader,
  ];
  handlers.beforePut = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.submissionApplyPatch,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.allowTimestampOverride,
    router.formio.middleware.bootstrapEntityOwner,
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.addSubmissionResourceAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    router.formio.middleware.loadPreviousSubmission,
    handlers.beforePut,
  ];
  handlers.afterPut = [
    handlers.afterPut,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('update', (req) => router.formio.cache.getCurrentFormId(req)),
  ];
  handlers.beforeIndex = [
    (req, res, next) => {
      // If we leave list in query it will interfere with the find query.
      if (req.query.list) {
        req.filterIndex = true;
        delete req.query.list;
      }

      if (req.query.full) {
        req.full = true;
        delete req.query.full;
      }

      next();
    },
    router.formio.middleware.permissionHandler,
    router.formio.middleware.setFilterQueryTypes,
    router.formio.middleware.filterMongooseExists({
      field: 'deleted',
      isNull: true,
      resource: 'submission',
    }),
    router.formio.middleware.ownerFilter,
    router.formio.middleware.submissionResourceAccessFilter,
    router.formio.middleware.submissionFieldMatchAccessFilter,
    handlers.beforeIndex,
  ];
  handlers.afterIndex = [
    handlers.afterIndex,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('index', (req) => router.formio.cache.getCurrentFormId(req)),
    router.formio.middleware.filterIndex(['data']),
  ];
  handlers.beforeDelete = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeDelete,
    router.formio.middleware.loadPreviousSubmission,
    router.formio.middleware.deleteSubmissionHandler,
  ];
  handlers.afterDelete = [
    handlers.afterDelete,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('delete', (req) => router.formio.cache.getCurrentFormId(req)),
  ];

  // Register an exists endpoint to see if a submission exists.
  router.get(
    '/form/:formId/exists',
    async (req, res, next) => {
      const {ignoreCase = false} = req.query;
      // We need to strip the ignoreCase query out so resourcejs does not use it as a filter
      if (ignoreCase) {
        delete req.query['ignoreCase'];
      }
      // First load the form.
      try {
        const form = await router.formio.cache.loadCurrentForm(req);
        await hook.alter('getSubmissionModel', router.formio, req, form, false);
        // Get the find query for this item.
        const query = router.formio.resources.submission.getFindQuery(req);
        if (_.isEmpty(query)) {
          return res.status(400).send('Invalid query');
        }

        query.form = form._id;
        query.deleted = {$eq: null};
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;

        // Query the submissions for this submission.
        const submission = await submissionModel.findOne(
          hook.alter('submissionQuery', query, req),
          null,
          ignoreCase && router.formio.mongoFeatures.collation ? {collation: {locale: 'en', strength: 2}} : {}
        );
        // Return not found.
        if (!submission || !submission._id) {
          return res.status(404).send('Not found');
        }
        // By default check permissions to access the endpoint.
        const withoutPermissions = _.get(form, 'settings.allowExistsEndpoint', false);

        if (withoutPermissions) {
          // Send only the id as a response if the submission exists.
          return res.status(200).json({
            _id: submission._id.toString(),
          });
        }
 else {
          req.subId = submission._id.toString();
          req.permissionsChecked = false;
          return next();
        }
      }
 catch (err) {
        return next(err);
      }
    },
    router.formio.middleware.permissionHandler,
    (req, res, next) => {
      return res.status(200).json({
        _id: req.subId,
      });
    }
  );

  router.delete(
    '/form/:formId/submission',
    ...handlers.beforeDelete.filter((_, idx) => idx !== 1),
    ...handlers.afterDelete,
    (req, res) => {
      return res.resource ? res.status(res.resource.status).json(res.resource.item) : res.sendStatus(400);
    }
  );

  /**
   * Helper to prepare bulk submission context (shared by bulk create and upsert endpoints)
   */
  async function prepareBulkSubmissionContext({req, res, router, isUpsert}) {
    const {formId} = req.params;
    const {formio} = router;
    const hook = require('../util/hook')(formio);

    const payload = Array.isArray(req.body) ? req.body[0] : req.body;
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0 || !Array.isArray(payload.data)) {
      res.status(400).json({error: "Payload must contain a 'data' array."});
      return null;
    }

    const form = await router.formio.cache.loadCurrentForm(req);
    const submissionModel = req.submissionModel || formio.resources.submission.model;

    req.form = form;
    req.body = {data: {}};
    await formio.middleware.permissionHandler(req, res, () => {});

    const now = new Date();
    const owner = req.user?._id || null;

    const docs = payload.data.map((item, index) => {
      const doc = {
        originalIndex: index,
        form: formId,
        data: {...item},
        metadata: payload.metadata,
        state: payload.state || 'submitted',
        owner,
        deleted: null,
        created: now,
        modified: now,
      };
      // For upsert, ensure _id is inside data for uniqueness logic
      if (isUpsert && (item._id || (item.data && item.data._id))) {
        doc.data._id = item._id || item.data._id;
      }
      return doc;
    });

    const validationResults = await validateAndCheckUniquenessForSubmission({form, docs, req, formio});

    // Build failures and valid docs
    const failures = [];
    const validDocs = [];
    validationResults.forEach((result) => {
      if (!result.valid) {
        failures.push({
          original: result.doc.data,
          errors: result.errors,
          originalIndex: result.originalIndex,
        });
      }
 else {
        validDocs.push(result.doc);
      }
    });

    return {form, submissionModel, docs, failures, validDocs, payload, hook};
  }

  /**
   * Helper to extract successful inserts and failures from insertMany error
   */
  function hydrateBulkInsertSuccessesAndFailures(err, payload, validDocs, util) {
    let successes = [];
    if (err.result && typeof err.result.getInsertedIds === 'function') {
      const insertedIds = err.result.getInsertedIds();
      successes = insertedIds.map(({index, _id}) => ({
        original: payload.data[validDocs[index]?.originalIndex],
        submission: {_id: _id?.toString?.() || String(_id)},
      }));
    }
 else if (Array.isArray(err.insertedDocs)) {
      successes = err.insertedDocs.map((doc, i) => ({
        original: payload.data[validDocs[i]?.originalIndex],
        submission: {_id: doc._id?.toString?.() || String(doc._id)},
      }));
    }

    const failures = (err.writeErrors || []).map((e) => ({
      original: payload.data[e.index],
      errors: [{type: 'insert', message: e.errmsg || e.message}],
      originalIndex: validDocs[e.index]?.originalIndex ?? e.index,
    }));

    return {successes, failures};
  }

  /**
   * Bulk Create Submissions Endpoint - POST /form/:formId/submissions
   *
   * Handles the creation of multiple submission documents in a single bacth request.
   *
   * Request Body
   * - `data`: An array of submission objects to be created.
   *
   * Steps
   * 1. Validation -  Calls `prepareBulkSubmissionContext` to:
   *    - Load the target form and its model.
   *    - Parse and validate the incoming submission documents.
   *    - Perform batch validation and uniqueness checks (both in-memory and against the database) using
   *      `validateAndCheckUniquenessForSubmission`.
   *    - Separate valid and invalid documents, collecting validation errors.
   * 2. Hook Extension Point - Invokes the `bulkSubmissionDocuments` hook, allowing plugins or custom logic
   *    to modify the array of valid submissions before insertion (e.g., enrich data, add audit fields, enforce business logic).
   * 3. Bulk Insert - Uses `insertMany` to insert all valid documents into the database. Partial failures do not abort the entire batch.
   * 4. Response Handling:
   *    - On success: Returns a 201 response with the count of inserted documents, details for each successful submission, and any failures.
   *    - On partial failure (e.g., duplicate key): Returns a 207 response with the number of inserted documents
   *        and detailed failure information for each failed item.
   *    - On total failure: Returns a 400 response with failure details.
   *
   * Response Structure
   * - `insertedCount`: Number of successfully inserted documents.
   * - `successes`: Array of successfully created submissions, each including the original submission and its new `_id`.
   * - `failures`: Array of failed submissions with error details.
   *
   * Sample Request, on a form that has three fields, with requiredTextField2 marked as required and uniqueTextField3 marked as unique.
   * ```
   * POST /form/12345/submissions
   * {
   *   "data": [
   *       {
   *       "textField1": "textField1",
   *       "uniqueTextField3": "UniqueTextField1",
   *       "submit": true
   *       },
   *       {
   *       "textField1": "textField2",
   *       "requiredTextField2": "req1 longer than 10",
   *       "uniqueTextField3": "UniqueTextField2",
   *       "submit": true
   *       }
   *   ],
   *   "metadata": {
   *       "timezone": "America/New_York",
   *       "offset": -240,
   *       "origin": "http://localhost:3001",
   *       "referrer": "",
   *       "browserName": "Netscape",
   *       "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
   *       "pathName": "/",
   *       "onLine": true
   *   }
   * }
   * ```
   * Response:
   * ```
   * {
   *   "insertedCount": 0,
   *   "failures": [
   *       {
   *           "original": {
   *               "textField1": "textField1",
   *               "uniqueTextField3": "UniqueTextField1",
   *               "submit": true
   *           },
   *           "errors": [
   *               {
   *                   "type": "validator",
   *                   "message": "RequiredTextField2 is required"
   *               },
   *               {
   *                   "type": "unique",
   *                   "message": "Duplicate value for unique field uniqueTextField3"
   *               }
   *           ],
   *           "originalIndex": 0
   *       },
   *       {
   *           "original": {
   *               "textField1": "textField2",
   *               "requiredTextField2": "req1 longer than 10",
   *               "uniqueTextField3": "UniqueTextField2",
   *               "submit": true
   *           },
   *           "errors": [
   *               {
   *                   "type": "validator",
   *                   "message": "RequiredTextField2 must have no more than 10 characters."
   *               },
   *               {
   *                   "type": "unique",
   *                   "message": "Duplicate value for unique field uniqueTextField3"
   *               }
   *           ],
   *           "originalIndex": 1
   *       }
   *   ]
   * }
   * ```
   */
  router.post('/form/:formId/submissions', async (req, res, next) => {
    util.log('[create submissions] Received bulk create request');

    const context = await prepareBulkSubmissionContext({req, res, router, isUpsert: false});
    if (!context) {
      return;
    }
    const {form, submissionModel, failures, validDocs, payload, hook} = context;

    try {
      if (failures.length > 0 && validDocs.length === 0) {
        // Total failure: all docs invalid
        return res.status(400).json({insertedCount: 0, failures});
      }

      util.log('[create submissions] validation complete');
      // Extension point: allows plugins or custom hooks to modify the array of valid submissions
      await hook.alter('bulkSubmissionDocuments', validDocs, req, form);

      let result;

      try {
        result = await submissionModel.insertMany(validDocs, {ordered: false});
        util.log('[create submissions] post insertmany');
      }
 catch (err) {
        // Partial success: some succeeded, some failed
        util.log('[create submissions] error in insertmany try catch');
        if (
          (err.writeErrors && Array.isArray(err.writeErrors) && err.writeErrors.length > 0) ||
          (err.result && typeof err.result.nInserted === 'number' && err.result.nInserted > 0)
        ) {
          util.log('[create submissions] insertmany try catch block. there are errors');
          // Some docs may have been inserted before the error
          const {successes, failures} = hydrateBulkInsertSuccessesAndFailures(err, payload, validDocs, util);

          util.log('[create submissions] 207 insertmany try catch block.');
          return res.status(207).json({
            insertedCount: successes.length,
            successes,
            failures,
          });
        }
        // Unexpected error
        util.log('[create submissions] 400 insertmany try catch block total failure.');
        return res.status(400).json({
          insertedCount: 0,
          failures: [{error: err.message || String(err)}],
        });
      }

      // Full success or partial (pre-insert validation) success
      util.log('[create submissions] 201/207 partial or full success');
      const responseBody = {
        insertedCount: result.length,
        successes: result.map((doc, i) => ({
          original: payload.data[validDocs[i].originalIndex],
          submission: {_id: doc._id.toString()},
        })),
        failures,
      };
      if (failures.length > 0) {
        util.log('[create submissions] 207 partial success');
        return res.status(207).json(responseBody);
      }
      util.log('[create submissions] 201 full success');
      return res.status(201).json(responseBody);
    }
 catch (err) {
      // Unexpected error
      util.log('[create submissions] 400 total failure');
      return res.status(400).json({
        insertedCount: 0,
        failures: [{error: err.message || String(err)}],
      });
    }
  });

  /**
   * Bulk Upsert Submissions Endpoint - PUT /form/:formId/submissions
   *
   * Handles the upsert (insert or update) of multiple submission documents in a single request.
   *
   * Request Body
   * - `data`: An array of submission objects to be upserted.
   *   - If a document includes an `_id`, it will attempt to update the existing document with that `_id`.
   *   - If no `_id` is provided, a new document will be inserted.
   *
   * Steps
   * 1. Validation - Calls `prepareBulkSubmissionContext` with `isUpsert: true` to:
   *    - Load the target form and its model.
   *    - Parse and validate the incoming submission documents.
   *    - Perform batch validation and uniqueness checks (both in-memory and against the database).
   *    - Separate valid and invalid documents, collecting validation errors.
   * 2. Hook Extension Point - Invokes the `bulkSubmissionDocuments` hook, allowing plugins or custom logic
   *    to modify the array of valid submissions before upserting.
   * 3. Bulk Upsert
   *    - Uses `bulkWrite` to perform a mix of `updateOne` (with `upsert: true`) and `insertOne` operations for each valid document.
   *    - Each document with an `_id` triggers an update (or insert if not found); those without an `_id` are inserted.
   *    - The operation is unordered, so one failure does not abort the entire batch.
   * 4. Response Handling
   *    - On success: Returns a 200 response with counts and details for upserted and modified documents, and any failures.
   *    - On partial failure: Returns a 207 response with failure details.
   *    - On total failure: Returns a 400 response with failure details.
   *
   * Response Structure
   * - `upsertedCount`: Number of documents inserted as new.
   * - `modifiedCount`: Number of existing documents updated.
   * - `upserted`: Array of upserted submissions, each including the original submission and its `_id`.
   * - `modified`: Array of updated submissions, each including the original submission and its `_id`.
   * - `failures`: Array of failed submissions with error details.
   *
   * Sample request
   * ```
   * PUT /form/12345/submissions
   * {
   *   "data": [
   *       {
   *       "_id":"6895f019b3e98f17851b7f86",
   *       "textField1": "textField1",
   *       "uniqueTextField3": "UniqueTextField1",
   *       "submit": true
   *       },
   *       {
   *       "_id":"6895f019b3e98f17851b7f87",
   *       "textField1": "textField2",
   *       "requiredTextField2": "updated ",
   *       "submit": true
   *       }
   *  ],
   *  "metadata": {
   *      "timezone": "America/New_York",
   *      "offset": -240,
   *       "origin": "http://localhost:3001",
   *       "referrer": "",
   *       "browserName": "Netscape",
   *       "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
   *       "pathName": "/",
   *       "onLine": true
   *   }
   * }
   * ```
   * Response
   * ```
   * {
   *     "upsertedCount": 0,
   *     "modifiedCount": 1,
   *     "upserted": [],
   *     "modified": [
   *         {
   *             "original": {
   *                 "_id": "6895f019b3e98f17851b7f87",
   *                 "textField1": "textField2",
   *                 "requiredTextField2": "updated ",
   *                "submit": true
   *             },
   *             "submission": {
   *                 "_id": "6895f019b3e98f17851b7f87"
   *             }
   *         }
   *     ],
   *     "failures": [
   *         {
   *             "original": {
   *                 "textField1": "textField1",
   *                 "uniqueTextField3": "UniqueTextField1",
   *                 "submit": true,
   *                 "_id": "6895f019b3e98f17851b7f86"
   *             },
   *             "errors": [
   *                 {
   *                     "type": "validator",
   *                     "message": "RequiredTextField2 is required"
   *                 }
   *             ],
   *             "originalIndex": 0
   *         }
   *     ]
   * }
   * ```
   * Notes
   * - Validation and uniqueness checks are performed for all documents before upserting.
   * - The endpoint is designed for high-throughput, bulk operations, and is resilient to partial failures.
   */
  router.put('/form/:formId/submissions', async (req, res, next) => {
    util.log('[submissions] Received bulk submission upsert request');
    const context = await prepareBulkSubmissionContext({req, res, router, isUpsert: true});
    if (!context) {
return;
}
    const {submissionModel, failures, validDocs, payload} = context;

    try {
      if (failures.length > 0 && validDocs.length === 0) {
        return res.status(400).json({upsertedCount: 0, failures});
      }
      // Prepare bulkWrite operations
      const operations = validDocs.map((doc) => {
        if (doc.data._id) {
          return {
            updateOne: {
              filter: {_id: doc.data._id},
              update: {$set: {...doc, modified: new Date()}},
              upsert: true,
            },
          };
        }
 else {
          return {
            insertOne: {
              document: doc,
            },
          };
        }
      });

      // Perform the bulkWrite operation
      const result = await submissionModel.bulkWrite(operations, {ordered: false});

      // Build response arrays
      // upserted: Documents that did not exist and were created via upsert (updateOne with upsert:true, no match found)
      // modified: Documents that already existed and were updated (updateOne with upsert:true, match found)
      // inserted: Documents that were inserted via insertOne (no _id provided in input)
      const upserted = [];
      const modified = [];
      const inserted = [];

      // upsertedIds: keys are operation indexes for upserted (inserted) docs
      if (result.upsertedIds) {
        for (const idx in result.upsertedIds) {
          const opIndex = parseInt(idx, 10);
          const doc = validDocs[opIndex];
          upserted.push({
            original: payload.data[doc.originalIndex],
            submission: {
              _id: result.upsertedIds[idx]._id
                ? result.upsertedIds[idx]._id.toString()
                : result.upsertedIds[idx].toString(),
            },
          });
        }
      }

      // For updateOne ops not in upsertedIds, treat as modified
      operations.forEach((op, i) => {
        const doc = validDocs[i];
        // modified: updateOne with upsert:true, matched an existing doc
        if (op.updateOne && !(result.upsertedIds && i in result.upsertedIds)) {
          modified.push({
            original: payload.data[doc.originalIndex],
            submission: {_id: doc.data._id ? doc.data._id.toString() : undefined},
          });
        }
        // inserted: explicit insertOne ops (no _id provided)
        else if (op.insertOne) {
          inserted.push({
            original: payload.data[doc.originalIndex],
            submission: {_id: doc._id ? doc._id.toString() : undefined},
          });
        }
      });

      // Combine upserted and inserted for a single upserted array:
      const allUpserted = [...inserted, ...upserted];

      return res.status(200).json({
        upsertedCount: allUpserted.length,
        modifiedCount: modified.length,
        upserted: allUpserted,
        modified,
        failures,
      });
    }
 catch (err) {
      // Handle bulkWrite errors
      const failures = (err.writeErrors || []).map((e) => ({
        original: payload.data[e.index],
        error: e.errmsg || e.message,
      }));

      return res.status(207).json({
        upsertedCount: 0,
        modifiedCount: 0,
        upserted: [],
        modified: [],
        failures,
      });
    }
  });

  class SubmissionResource extends Resource {
    patch(options) {
      options = Resource.getMethodOptions('put', options);
      this.methods.push('patch');
      this._register(
        'patch',
        `${this.route}/:${this.name}Id`,
        (req, res, next) => {
          // Store the internal method for response manipulation.
          req.__rMethod = 'patch';

          if (req.skipResource) {
            return next();
          }

          const update = _.omit(req.body, ['_id', '__v']);
          update.modified = new Date();
          router.formio.resources.submission.model
            .findOneAndUpdate({_id: req.params[`${this.name}Id`]}, {$set: update})
            .then((item) => {
              if (!item) {
                return Resource.setResponse(res, {status: 404}, next);
              }

              const updatedItem = _.assign(item, update);

              return Resource.setResponse(res, {status: 200, item: updatedItem}, next);
            })
            .catch((err) => {
              return Resource.setResponse(res, {status: 400, error: err}, next);
            });
        },
        Resource.respond,
        options
      );
      return this;
    }
  }

  // Since we are handling patching before we get to resourcejs, make it work like put.

  const MySubmissionResource = hook.alter('SubmissionResource', SubmissionResource, null);

  const submissionResource = new MySubmissionResource(
    router,
    '/form/:formId',
    'submission',
    router.formio.mongoose.model('submission'),
    {
      convertIds: /(^|\.)(_id|form|owner)$/,
    }
  ).rest(
    hook.alter('submissionRoutes', {
      ...handlers,
      hooks: {
        put: {
          before(req, res, item, next) {
            if (item.data) {
              item.markModified('data');
            }

            return next();
          },
        },
      },
    })
  );

  _.each(handlers, (handler) => {
    _.each(handler, (fn, index) => {
      handler[index] = fn.bind(submissionResource);
    });
  });
  submissionResource.handlers = handlers;
  return submissionResource;
};
