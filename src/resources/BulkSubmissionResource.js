'use strict';

const _ = require('lodash');
const util = require('../util/util');
const {ObjectId} = require('mongodb');

class BulkSubmission {
  constructor(router) {
    this.router = router;
    this.formio = router.formio;
    this.hook = require('../util/hook')(this.formio);
  }

  /**
   * Utility to recursively find all unique fields in a form definition
   */
  getUniqueFieldsFromForm(form) {
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
   *   - Checks for uniqueness violations against the database for all unique fields
   *
   * Returns an array of results, each with:
   *   - valid: boolean, true if the doc passes all checks
   *   - errors: array of error objects ({ type: 'unique' | 'validator', message })
   *   - doc: the original submission document
   *   - originalIndex: the index of the doc in the input array
   */
  async checkUniquenessForBulkSubmissionsPayload({form, docs}) {
    const duplicateValueErrorMessage = 'Duplicate value for unique field';
    const uniqueFields = this.getUniqueFieldsFromForm(form);

    const seenMaps = {};
    uniqueFields.forEach((field) => {
      seenMaps[field] = new Map();
    });

    const duplicatePairs = [];

    const results = await Promise.all(
      docs.map(async (doc, idx) => {
        const errors = [];
        uniqueFields.forEach((field) => {
          const value = _.get(doc.data, field);
          if (value !== undefined && value !== null) {
            if (seenMaps[field].has(value)) {
              const msg = `${duplicateValueErrorMessage} ${field}`;
              errors.push({type: 'unique', message: msg});
              duplicatePairs.push({field, firstIdx: seenMaps[field].get(value), dupIdx: idx, msg});
            }
            else {
              seenMaps[field].set(value, idx);
            }
          }
        });
        return {
          valid: errors.length === 0,
          errors,
          doc,
          originalIndex: doc.originalIndex,
        };
      })
    );

    duplicatePairs.forEach(({firstIdx, msg}) => {
      results[firstIdx].errors.push({type: 'unique', message: msg});
      results[firstIdx].valid = false;
    });

    return results;
  }

  /**
   * Process multiple documents through submission handlers
   * 
   * @param {Array} payload - Array of documents to process
   * @param {Object} submissionHandlers - The submission handlers object
   * @param {Object} baseReq - Base request object
   * @returns {Promise<Array>} Array of processed results
   */
  async processDocuments(payload, submissionHandlers, baseReq) {
    async function executeMiddlewareArray(middlewares, req, res) {
      for (const middleware of middlewares) {
        await new Promise((resolve, reject) => {
          middleware(req, res, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }
    }

    const results = await Promise.all(
      payload.map(async (item) => {
        const errors = [];
        let processedDoc = item;
    
        const mockReq = {
          ...baseReq,
          body: processedDoc,
          method: baseReq.method,
          params: {...baseReq.params, submissionId: processedDoc._id}, 
          currentForm: baseReq.currentForm,
          query: baseReq.query || {},
          headers: baseReq.headers || {},
          isAdmin: baseReq.isAdmin
        };
        
        const mockRes = {
          submission: null,
          resource: null,
          headersSent: false,
          statusCode: null,
          jsonData: null,
          status: function(code) {
            this.statusCode = code;
            return this;
          },
          json: function(data) {
            this.jsonData = data;
            return this;
          }
        };
        
        try {
          await executeMiddlewareArray(submissionHandlers, mockReq, mockRes);
          processedDoc = {
            ...processedDoc,
            ...mockReq.body,
          };
        }
        catch (error) {
          const details = Array.isArray(error.details)
            ? error.details
            : [{message: error.message || error, level: 'error', path: []}];

          details.forEach((e) => errors.push({type: 'validator', message: e.message || e}));
        }
        
        return {
          valid: errors.length === 0,
          errors,
          doc: processedDoc,
          originalIndex: item.originalIndex !== undefined ? item.originalIndex : item.originalIndex
        };
      })
    );
    
    return results;
  }

  /**
   * Helper to prepare bulk submission context (shared by bulk create and upsert endpoints)
   */
  async prepareBulkSubmissionContext({req, res, isUpsert}) {
    const {formId} = req.params;

    const payload = Array.isArray(req.body) ? req.body : null;
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      res.status(400).json({error: "Payload must be an array of submission objects."});
      return null;
    }

    for (let i = 0; i < payload.length; i++) {
      if (!payload[i].data || typeof payload[i].data !== 'object') {
        res.status(400).json({error: `Item at index ${i} must contain a 'data' object.`});
        return null;
      }
    }

    if (this.formio.config.maxBulkSubmission && payload.length > this.formio.config.maxBulkSubmission) {
      res.status(413).json({error: `Bulk submission limit exceeded. Maximum ${this.formio.config.maxBulkSubmission} submissions allowed per request.`});
      return null;
    }

    const form = await this.formio.cache.loadCurrentForm(req);
    const submissionModel = req.submissionModel || this.formio.resources.submission.model;

    req.form = form;
    req.body = {data: {}};
    await this.formio.middleware.permissionHandler(req, res, () => {});

    const now = new Date();
    const owner = req.user?._id || null;

    const docs = payload.map((item, index) => {
      const doc = {
        ...item,
        originalIndex: index,
        form: formId,
        data: item.data,
        metadata: item.metadata,
        owner,
        deleted: null,
        created: now,
        modified: now,
      };
      this.hook.alter('enrichBulkSubmissionDoc', req, doc);
      return doc;
    });

    const validationResults = await this.checkUniquenessForBulkSubmissionsPayload({form, docs});

    const failures = [];
    const IntermediateValidDocs = [];
    validationResults.forEach((result) => {
      if (!result.valid) {
        failures.push({
          original: result.doc.data,
          errors: result.errors,
          originalIndex: result.originalIndex,
        });
      }
      else {
        IntermediateValidDocs.push(result.doc);
      }
    });

    const validDocs = [];
    const processedResults = await this.processDocuments(
      IntermediateValidDocs,
      isUpsert ? this.formio.middleware.submissionHandler.beforePut : this.formio.middleware.submissionHandler.beforePost,
      req
    );

    processedResults.forEach((result) => {
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

    return {form, submissionModel, failures, validDocs, payload};
  }

  /**
   * Helper to extract successful inserts and failures from insertMany error
   */
  hydrateBulkInsertSuccessesAndFailures(err, payload, validDocs) {
    let successes = [];
    if (err.result && typeof err.result.getInsertedIds === 'function') {
      const insertedIds = err.result.getInsertedIds();
      successes = insertedIds.map(({index, _id}) => ({
        original: payload[validDocs[index]?.originalIndex],
        submission: {_id: _id?.toString?.() || String(_id)},
      }));
    }
    else if (Array.isArray(err.insertedDocs)) {
      successes = err.insertedDocs.map((doc, i) => ({
        original: payload[validDocs[i]?.originalIndex],
        submission: {_id: doc._id?.toString?.() || String(doc._id)},
      }));
    }

    const failures = (err.writeErrors || []).map((e) => ({
      original: payload[validDocs[e.index]?.originalIndex],
      errors: [{type: 'insert', message: e.errmsg || e.message}],
      originalIndex: validDocs[e.index]?.originalIndex ?? e.index,
    }));

    return {successes, failures};
  }

  /**
   * Handle Bulk Create Submissions Endpoint - POST /form/:formId/submissions
   *
   * Handles the creation of multiple submission documents in a single bacth request.
   *
   * Request Body
   * - An array of self-contained submission objects, each with its own `data` and optional `metadata` fields.
   *
   * Steps
   * 1. Validation -  Calls `prepareBulkSubmissionContext` to:
   *    - Load the target form and its model.
   *    - Parse and validate the incoming submission documents.
   *    - Perform batch validation and uniqueness checks (in-memory) using
   *      `checkUniquenessForBulkSubmissionsPayload`.
   *    - Process each item as an individual submission (including full validation process)
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
   * [
   *   {
   *     "data": {
   *       "textField1": "textField1",
   *       "uniqueTextField3": "UniqueTextField1",
   *       "submit": true
   *     },
   *     "metadata": {
   *       "timezone": "America/New_York",
   *       "offset": -240,
   *       "origin": "http://localhost:3001",
   *       "referrer": "",
   *       "browserName": "Netscape",
   *       "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
   *       "pathName": "/",
   *       "onLine": true
   *     }
   *   },
   *   {
   *     "data": {
   *       "textField1": "textField2",
   *       "requiredTextField2": "req1 longer than 10",
   *       "uniqueTextField3": "UniqueTextField2",
   *       "submit": true
   *     },
   *     "metadata": {
   *       "timezone": "America/New_York",
   *       "offset": -240,
   *       "origin": "http://localhost:3001",
   *       "referrer": "",
   *       "browserName": "Netscape",
   *       "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
   *       "pathName": "/",
   *       "onLine": true
   *     }
   *   }
   * ]
   * ```
   * Response:
   * ```
   * {
   *   "insertedCount": 0,
   *   "failures": [
   *       {
   *           "original": {
   *               "data": {
   *                   "textField1": "textField1",
   *                   "uniqueTextField3": "UniqueTextField1",
   *                   "submit": true
   *               },
   *               "metadata": {...}
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
   *               "data": {
   *                   "textField1": "textField2",
   *                   "requiredTextField2": "req1 longer than 10",
   *                   "uniqueTextField3": "UniqueTextField2",
   *                   "submit": true
   *               },
   *               "metadata": {...}
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
  async handleBulkCreate(req, res) {
    util.log('[create submissions] Received bulk create request');
    
    const context = await this.prepareBulkSubmissionContext({req, res, isUpsert: false});
    if (!context) return;
    
    const {form, submissionModel, failures, validDocs, payload} = context;

    if (form.submissionRevisions) {
      return res.status(501).send('The functionality has not been implemented for forms with enabled submissions revisions');
    }

    try {
      if (failures.length > 0 && validDocs.length === 0) {
        return res.status(400).json({insertedCount: 0, failures});
      }

      let result;
      try {
        result = await submissionModel.insertMany(validDocs, {ordered: false});
      }
      catch (err) {
        if (
          (err.writeErrors && Array.isArray(err.writeErrors) && err.writeErrors.length > 0) ||
          (err.result && typeof err.result.nInserted === 'number' && err.result.nInserted > 0)
        ) {
          const {successes, failures} = this.hydrateBulkInsertSuccessesAndFailures(err, payload, validDocs);
          return res.status(207).json({
            insertedCount: successes.length,
            successes,
            failures,
          });
        }
        return res.status(400).json({
          insertedCount: 0,
          failures: [{error: err.message || String(err)}],
        });
      }

      const responseBody = {
        insertedCount: result.length,
        successes: result.map((doc, i) => ({
          original: payload[validDocs[i].originalIndex],
          submission: {_id: doc._id.toString()},
        })),
        failures,
      };
      
      return res.status(failures.length > 0 ? 207 : 201).json(responseBody);
    }
    catch (err) {
      return res.status(400).json({
        insertedCount: 0,
        failures: [{error: err.message || String(err)}],
      });
    }
  }

  /**
   * Handle Bulk Upsert Submissions Endpoint - PUT /form/:formId/submissions
   *
   * Handles the upsert (insert or update) of multiple submission documents in a single request.
   *
   * Request Body
   * - An array of self-contained submission objects, each with its own `data` and optional `metadata` fields.
   *   - If a document includes an `_id` in its data, it will attempt to update the existing document with that `_id`.
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
   * [
   *   {
   *     "_id": "6895f019b3e98f17851b7f86",
   *     "data": {
   *       "textField1": "textField1",
   *       "uniqueTextField3": "UniqueTextField1",
   *       "submit": true
   *     },
   *     "metadata": {
   *       "timezone": "America/New_York",
   *       "offset": -240,
   *       "origin": "http://localhost:3001",
   *       "referrer": "",
   *       "browserName": "Netscape",
   *       "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
   *       "pathName": "/",
   *       "onLine": true
   *     }
   *   },
   *   {
   *     "_id": "6895f019b3e98f17851b7f87",
   *     "data": {
   *       "_id": "6895f019b3e98f17851b7f87",
   *       "textField1": "textField2",
   *       "requiredTextField2": "updated ",
   *       "submit": true
   *     },
   *     "metadata": {
   *       "timezone": "America/New_York",
   *       "offset": -240,
   *       "origin": "http://localhost:3001",
   *       "referrer": "",
   *       "browserName": "Netscape",
   *       "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
   *       "pathName": "/",
   *       "onLine": true
   *     }
   *   }
   * ]
   * ```
   * Response
   * ```
   * {
   *     "upsertedCount": 0,
   *     "modifiedCount": 1,
   *     "upserted": [],
   *     "modified": [
   *         {
   *           "original": {
   *               "data": {
   *                   "_id": "6895f019b3e98f17851b7f87",
   *                   "textField1": "textField2",
   *                   "requiredTextField2": "updated ",
   *                   "submit": true
   *               },
   *               "metadata": {...}
   *           },
   *           "submission": {
   *               "_id": "6895f019b3e98f17851b7f87"
   *           }
   *         }
   *     ],
   *     "failures": [
   *         {
   *             "original": {
   *                 "data": {
   *                     "textField1": "textField1",
   *                     "uniqueTextField3": "UniqueTextField1",
   *                     "submit": true,
   *                     "_id": "6895f019b3e98f17851b7f86"
   *                 },
   *                 "metadata": {...}
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
  async handleBulkUpsert(req, res) {
    util.log('[submissions] Received bulk submission upsert request');

    const context = await this.prepareBulkSubmissionContext({req, res, isUpsert: true});
    if (!context) return;
    
    const {form, submissionModel, failures, validDocs, payload} = context;

    if (form.submissionRevisions) {
      return res.status(501).send('The functionality has not been implemented for forms with enabled submissions revisions');
    }

    try {
      if (failures.length > 0 && validDocs.length === 0) {
        return res.status(400).json({upsertedCount: 0, failures});
      }

      const operations = validDocs.map((doc) => {
        doc._id ??= new ObjectId().toString();
        return {
          updateOne: {
            filter: {_id: doc._id},
            update: {$set: {...doc, modified: new Date()}},
            upsert: true,
          },
        };
      });

      const result = await submissionModel.bulkWrite(operations, {ordered: false});
      
      const upserted = [];
      const modified = [];

      const upsertedIdSet = new Set(
        Object.values(result.upsertedIds ?? {}).map(id => id.toString())
      );

      validDocs.forEach(doc => {
        const docIdStr = doc._id.toString();
        
        if (upsertedIdSet.has(docIdStr)) {
          upserted.push({
            original: payload[doc.originalIndex],
            submission: {_id: docIdStr},
          });
        } else {
          modified.push({
            original: payload[doc.originalIndex],
            submission: {_id: docIdStr},
          });
        }
      });

      const responseBody = {
        upsertedCount: upserted.length,
        modifiedCount: modified.length,
        upserted,
        modified,
        failures,
      };
      
      return res.status(failures.length > 0 ? 207 : 200).json(responseBody);
    }
    catch (err) {
      const failures = (err.writeErrors || []).map((e) => ({
        original: payload[validDocs[e.index]?.originalIndex],
        error: e.errmsg || e.message,
        originalIndex: validDocs[e.index]?.originalIndex ?? e.index,
      }));

      return res.status(207).json({
        upsertedCount: 0,
        modifiedCount: 0,
        upserted: [],
        modified: [],
        failures,
      });
    }
  }

  /**
   * Register routes
   */
  register() {
    this.router.post('/form/:formId/submissions', this.handleBulkCreate.bind(this));
    this.router.put('/form/:formId/submissions', this.handleBulkUpsert.bind(this));    
  }
}

module.exports = function(router) {
  const bulkSubmission = new BulkSubmission(router);
  return bulkSubmission.register();
};

module.exports.BulkSubmission = BulkSubmission;