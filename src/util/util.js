'use strict';

const mongoose = require('mongoose');
const moment = require('moment');
const ObjectID = require('mongodb').ObjectId;
const _ = require('lodash');
const nodeUrl = require('url');
const deleteProp = require('delete-property').default;
const errorCodes = require('./error-codes.js');
const fetch = require('@formio/node-fetch-http-proxy');
const {mockBrowserContext} = require('@formio/vm');
mockBrowserContext();
const Formio = require('@formio/js');
const debug = {
  idToBson: require('debug')('formio:util:idToBson'),
  getUrlParams: require('debug')('formio:util:getUrlParams'),
  removeProtectedFields: require('debug')('formio:util:removeProtectedFields')
};

const Utils = {
  Formio: Formio.Formio,
  FormioUtils: Formio.Utils,
  deleteProp: deleteProp,

  /**
   * A wrapper around console.log that gets ignored by eslint.
   *
   * @param {*} content
   *   The content to pass to console.log.
   */
  log(content) {
    if (process.env.TEST_SUITE) {
      return;
    }

    /* eslint-disable */
    console.log(content);
    /* eslint-enable */
  },

  /**
   * Determine if a value is a boolean representation.
   * @param value
   * @return {boolean}
   */
  isBoolean(value) {
    if (typeof value === 'boolean') {
      return true;
    }
    else if (typeof value === 'string') {
      value = value.toLowerCase();
      return (value === 'true') || (value === 'false');
    }
    return false;
  },

  /**
   * Quick boolean coercer.
   * @param value
   * @return {boolean}
   */
  boolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return (value.toLowerCase() === 'true');
    }
    return !!value;
  },

  /**
   * A wrapper around console.error that gets ignored by eslint.
   *
   * @param {*} content
   *   The content to pass to console.error.
   */
  error(content) {
    /* eslint-disable */
    console.error(content);
    /* eslint-enable */
  },

  /**
   * Returns the URL alias for a form provided the url.
   */
  getAlias(req, reservedForms) {
    /* eslint-disable no-useless-escape */
    const formsRegEx = new RegExp(`\/(${reservedForms.join('|')}).*`, 'i');
    /* eslint-enable no-useless-escape */
    const alias = req.url.substr(1).replace(formsRegEx, '');
    let additional = req.url.substr(alias.length + 1);
    if (!additional && req.method === 'POST') {
      additional = '/submission';
    }
    return {
      alias: alias,
      additional: additional
    };
  },

  /**
   * Escape a string for use in regex.
   *
   * @param str
   * @returns {*}
   */
  escapeRegExp(str) {
    /* eslint-disable */
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    /* eslint-enable */
  },

  /**
   * Create a sub response object that only handles errors.
   *
   * @param res
   * @return {{send: function(), sendStatus: function(*=), status: function(*=)}}
   */
  createSubResponse(response) {
    response = response || _.noop;
    const subResponse = {
      statusCode: 200,
      send: (err) => response(err),
      json: (err) => response(err),
      setHeader: () => _.noop,
      sendStatus: (status) => {
        subResponse.statusCode = status;
        response(status);
      },
      status: (status) => {
        subResponse.statusCode = status;
        return subResponse;
      }
    };
    return subResponse;
  },

  /**
   * Create a sub-request object from the original request.
   *
   * @param req
   */
  createSubRequest(req) {
    // Determine how many child requests have been made.
    const childRequests = req.childRequests || 0;

    // Break recursive child requests.
    if (childRequests > 5) {
      return null;
    }

    // Save off formio for fast cloning...
    const cache = req.formioCache;
    delete req.formioCache;

    // Clone the request.
    const childReq = _.clone(req);
    childReq.params = _.clone(childReq.params);
    childReq.query = _.clone(childReq.query);

    // Add the parameters back.
    childReq.formioCache = cache;
    childReq.user = req.user;
    childReq.modelQuery = null;
    childReq.countQuery = null;
    childReq.childRequests = childRequests + 1;
    childReq.permissionsChecked = false;

    // Delete the actions cache.
    delete childReq.actions;

    // Delete submission model.
    delete childReq.submissionModel;

    // Delete default resourceData from actions
    // otherwise you get an endless loop
    delete childReq.resourceData;

    // Delete skipResource so child requests can decide
    // this for themselves
    delete childReq.skipResource;

    return childReq;
  },

  /**
   * Iterate through each component within a form.
   *
   * @param {Object} components
   *   The components to iterate.
   * @param {Function} fn
   *   The iteration function to invoke for each component.
   * @param {Boolean} includeAll
   *   Whether or not to include layout components.
   * @param {String} path
   */
  eachComponent: Formio.Utils.eachComponent.bind(Formio.Utils),

  /**
   * Get a component by its key
   *
   * @param {Object} components
   *   The components to iterate.
   * @param {String} key
   *   The key of the component to get.
   *
   * @returns {Object}
   *   The component that matches the given key, or undefined if not found.
   */
  getComponent: Formio.Utils.getComponent.bind(Formio.Utils),

  /**
   * Define if component should be considered input component
   *
   * @param {Object} componentJson
   *   JSON of component to check
   *
   * @returns {Boolean}
   *   If component is input or not
   */
  isInputComponent: Formio.Utils.isInputComponent.bind(Formio.Utils),

  /**
   * Flatten the form components for data manipulation.
   *
   * @param {Object} components
   *   The components to iterate.
   * @param {Boolean} includeAll
   *   Whether or not to include layout components.
   *
   * @returns {Object}
   *   The flattened components map.
   */
  flattenComponents: Formio.Utils.flattenComponents.bind(Formio.Utils),

  /**
   * Get the value for a component key, in the given submission.
   *
   * @param {Object} submission
   *   A submission object to search.
   * @param {String} key
   *   A for components API key to search for.
   */
  getValue: Formio.Utils.getValue.bind(Formio.Utils),

  /**
   * Determine if a component is a layout component or not.
   *
   * @param {Object} component
   *   The component to check.
   *
   * @returns {Boolean}
   *   Whether or not the component is a layout component.
   */
  isLayoutComponent: Formio.Utils.isLayoutComponent.bind(Formio.Utils),

  /**
   * Apply JSON logic functionality.
   *
   * @param component
   * @param row
   * @param data
   */
  jsonLogic: Formio.Utils.jsonLogic,

  /**
   * Check if the condition for a component is true or not.
   *
   * @param component
   * @param row
   * @param data
   */
  checkCondition: Formio.Utils.checkCondition.bind(Formio.Utils),

  /**
   * Return the objectId.
   *
   * @param id
   * @returns {*}
   * @constructor
   */
  ObjectId(id) {
    try {
      return _.isObject(id)
        ? id
        : new ObjectID(id);
    }
    catch (e) {
      return id;
    }
  },

/**
   * Search the request headers for the given key.
   *
   * @param req
   *   The Express request object.
   * @param key
   *   The key to search for in the headers.
   *
   * @return
   *   The header value if found or false.
   */
  getHeader(req, key) {
    if (req.headers && typeof req.headers[key] !== 'undefined') {
      return req.headers[key];
    }

    return false;
  },

  /**
   * Search the request query for the given key.
   *
   * @param req
   *   The Express request object.
   * @param key
   *   The key to search for in the query.
   *
   * @return
   *   The query value if found or false.
   */
  getQuery(req, key) {
    if (req.query && typeof req.query[key] !== 'undefined') {
      return req.query[key];
    }

    return false;
  },

  /**
   * Search the request parameters for the given key.
   *
   * @param req
   *   The Express request object.
   * @param key
   *   The key to search for in the parameters.
   *
   * @return
   *   The parameter value if found or false.
   */
  getParameter(req, key) {
    if (req.params && typeof req.params[key] !== 'undefined') {
      return req.params[key];
    }

    return false;
  },

  /**
   * Determine if the request has the given key set as a header or url parameter.
   *
   * @param req
   *   The Express request object.
   * @param key
   *   The key to search for.
   *
   * @return
   *   Return the value of the key or false if not found.
   */
  getRequestValue(req, key) {
    let ret = null;

    // If the header is present, return it.
    ret = this.getHeader(req, key);
    if (ret !== false) {
      return ret;
    }

    // If the url query is present, return it.
    ret = this.getQuery(req, key);
    if (ret !== false) {
      return ret;
    }

    // If the url parameter is present, return it.
    ret = this.getParameter(req, key);
    if (ret !== false) {
      return ret;
    }

    return false;
  },

  /**
   * Split the given URL into its key/value pairs.
   *
   * @param url
   *   The request url to split, typically req.url.
   *
   * @returns {{}}
   *   The key/value pairs of the request url.
   */
  getUrlParams(url) {
    const urlParams = {};
    if (!url) {
      return urlParams;
    }
    const parsed = nodeUrl.parse(url);
    let parts = parsed.pathname.split('/');
    debug.getUrlParams(parsed);

    // Remove element originating from first slash.
    parts = _.tail(parts);

    // Url is not symmetric, add an empty value for the last key.
    if ((parts.length % 2) !== 0) {
      parts.push('');
    }

    // Build key/value list.
    for (let a = 0; a < parts.length; a += 2) {
      urlParams[parts[a].toLowerCase()] = parts[a + 1];
    }

    debug.getUrlParams(urlParams);
    return urlParams;
  },

  /**
   * Converts a form component key into a submission key
   * by putting .data. between each nested component
   * (ex: `user.name` becomes `user.data.name` in a submission)
   * @param key
   *   The key to convert
   * @return
   *   The submission key
   */
  getSubmissionKey(key) {
    return key.replace(/\./g, '.data.');
  },

  /**
   * Converts a submission key into a form component key
   * by replacing .data. with .
   * (ex: `user.data.name` becomes `user.name` in a submission)
   * @param key
   *   The key to convert
   * @return
   *   The form component key
   */
  getFormComponentKey(key) {
    return key.replace(/\.data\./g, '.');
  },

  /**
   * A node-fetch shim adding support for http(s) proxy and allowing
   * invalid tls certificates (to be used with self signed certificates).
   *
   * @param {any} url The request url string or url like object.
   * @param {any} options The request options object.
   * @returns {Promise<Response>} The promise with the node-fetch response object.
   */
  fetch,

  /**
   * Utility function to ensure the given id is always a BSON object.
   *
   * @param _id {String|Object}
   *   A mongo id as a string or object.
   *
   * @returns {Object}
   *   The mongo BSON id.
   */
  idToBson(_id) {
    try {
      _id = _.isObject(_id)
        ? _id
        : new mongoose.Types.ObjectId(_id);
    }
    catch (e) {
      debug.idToBson(`Unknown _id given: ${_id}, typeof: ${typeof _id}`);
    }

    return _id;
  },

  /**
   * Utility function to ensure the given id is always a string object.
   *
   * @param _id {String|Object}
   *   A mongo id as a string or object.
   *
   * @returns {String}
   *   The mongo string id.
   */
  idToString(_id) {
    return _.isObject(_id)
      ? _id.toString()
      : _id;
  },
  toMongoId(id) {
    id = id || '';
    let str = '';
    for (let i = 0; i < id.length; i++) {
      str += id[i].charCodeAt(0).toString(16);
    }
    return _.padEnd(str.substr(0, 24), 24, '0');
  },

    /**
   * Ensures that data has MongoDB ObjectID's for all "_id" fields.
   * @param data
   * @return {boolean}
   */
  transformIdsToObjectIds(data) {
    if (!data || !_.isObject(data)) {
      return;
    }
    _.each(data, (value, key) => {
      if (!value) {
        return;
      }
      if (_.isArray(value)) {
        value.forEach((arrayEl) => Utils.convertIdsToObjectIds(arrayEl));
      }
      else if (_.isObject(value)) {
        Utils.ensureIds(value);
      }
      else if ((key === '_id') &&
        (typeof value === 'string') &&
        ObjectID.isValid(value)
      ) {
        const bsonId = Utils.idToBson(value);
        if (bsonId) {
          data[key] = bsonId;
        }
      }
    });
  },

  /**
   * Ensures that a submission data has MongoDB ObjectID's for all "id" fields.
   * @param data
   * @return {boolean}
   */
  ensureIds(data) {
    if (!data) {
      return false;
    }
    let changed = false;
    _.each(data, (value, key) => {
      if (!value) {
        return;
      }
      if (_.isArray(value)) {
        changed = value.reduce((subchanged, row) => {
          return Utils.ensureIds(row) || subchanged;
        }, false) || changed;
      }
      else if (_.isObject(value)) {
        changed = Utils.ensureIds(value) || changed;
      }
      else if (
        (
          (key === '_id') ||
          (key === 'form') ||
          (key === 'owner')
        ) &&
        (typeof value === 'string') &&
        ObjectID.isValid(value)
      ) {
        const bsonId = Utils.idToBson(value);
        if (bsonId) {
          data[key] = bsonId;
          changed = true;
        }
      }
    });
    return changed;
  },

   /**
   * Transform dates objects inside the data into date strings
   * @param data
   * @return {boolean}
   */
  transformDataDatesToString(data) {
    if (!data || !_.isObject(data)) {
      return;
    }

    _.each(data, (value, key) => {
      if (!value) {
        return;
      }

      if (value instanceof Date) {
        data[key] = value.toISOString();
      }
      else if (_.isObject(value)) {
        Utils.transformDataDatesToString(value);
      }
    });
  },

  removeProtectedFields(form, action, submissions, doNotMinify) {
    if (!Array.isArray(submissions)) {
      submissions = [submissions];
    }

    // Collect tagpad keys for subsequent path adjustment
    // (tagpad submission has additional data field)
    const tagpadComponentsKeys = [];

    // Initialize our delete fields array.
    const modifyFields = [];

    // Iterate through all components.
    this.eachComponent(form.components, (component, path) => {
      path = `data.${path}`;
      if (component.type === 'tagpad') {
        tagpadComponentsKeys.push(component.key);
      }
      if (component.protected) {
        debug.removeProtectedFields('Removing protected field:', component.key);

        modifyFields.push((submission) => {
          function removeFieldByPath(obj, path) {
            // Split the path into an array of keys
            const keys = path.split('.');

            // Helper function to recursively traverse the object
            function traverseAndRemove(currentObj, currentKeys) {
              if (!currentObj || typeof currentObj !== 'object') {
                return;
              }

              // Add data field to tagpad component path
              if (tagpadComponentsKeys.includes(currentKeys[0])) {
                currentKeys = [currentKeys[0], 'data', ...currentKeys.slice(1)];
              }

              // Get the current key
              const key = currentKeys[0];

              // If this is the last key, delete the field
              if (currentKeys.length === 1) {
                if (Array.isArray(currentObj)) {
                  currentObj.forEach(item => delete item[key]);
                }
                else {
                  delete currentObj[key];
                }
              }
              else {
                // Recurse for arrays and objects
                if (Array.isArray(currentObj)) {
                  currentObj.forEach(item => traverseAndRemove(item, currentKeys));
                }
                else {
                    traverseAndRemove(currentObj[key], currentKeys.slice(1));
                  }
                }
              }

              // Start the recursion
              traverseAndRemove(obj, keys);
            }
            removeFieldByPath(submission, path);
        });
      }
      else if ((component.type === 'signature') && (action === 'index') && !doNotMinify) {
        modifyFields.push(((submission) => {
          const data = _.get(submission, path);
          if (!_.isUndefined(data)) {
            _.set(submission, path, (!data || (data.length < 25)) ? '' : 'YES');
          }
        }));
      }
      else if (component.type === 'file' && action === 'index' && !doNotMinify) {
        modifyFields.push(((submission) => {
          const data = _.map(
            _.get(submission, path),
            (file) => {
              if (file && file.url && file.url.startsWith('data:')) {
                return _.omit(file, 'url');
              }
              return file;
            }
          );
          _.set(submission, path, data);
        }));
      }
    }, true);

    // Iterate through each submission once.
    submissions.forEach((submission) =>
      modifyFields.forEach((modifyField) => modifyField(submission))
    );
  },

  /* eslint-disable new-cap */
  base64: {
    /**
     * Base64 encode the given data.
     *
     * @param {String} decoded
     *   The decoded data to encode.
     *
     * @return {String}
     *   The base64 representation of the given data.
     */
    encode(decoded) {
      return new Buffer.from(decoded.toString()).toString('base64');
    },
    /**
     * Base64 decode the given data.
     *
     * @param {String} encoded
     *   The encoded data to decode.
     *
     * @return {String}
     *   The ascii representation of the given encoded data.
     */
    decode(encoded) {
      return new Buffer.from(encoded.toString()).toString('ascii');
    }
  },
  /* eslint-enable new-cap */

  /**
   * Retrieve a unique machine name
   *
   * @param document
   * @param model
   * @param machineName
   * @param next
   * @return {*}
   */
  async uniqueMachineName(document, model, next) {
    var query = {
      machineName: {$regex: `^${_.escapeRegExp(document.machineName)}[0-9]*$`},
      deleted: {$eq: null}
    };
    if (document._id) {
      query._id = {$ne: document._id};
    }

    try {
      const records = await model.find(query).lean().exec();
      if (!records || !records.length) {
        return next();
      }

      let i = 0;
      records.forEach((record) => {
        const parts = record.machineName.split(/(\d+)$/).filter(Boolean);
        const number = parseInt(parts[1], 10) || 0;
        if (number > i) {
          i = number;
        }
      });
      document.machineName += ++i;
      return next();
    }
    catch (err) {
      return next(err);
    }
  },

  castValue(valueType, value) {
    switch (valueType) {
      case 'string':
        return value.toString();
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case '[number]':
        return value.replace(/(^,)|(,$)/g, '')
                         .split(',')
                         .map(val => Number(val));
      case '[string]':
        return value.replace(/(^,)|(,$)/g, '')
                         .split(',')
                         .map(val => val.toString());
    }
  },

  /**
   * Application error codes.
   */
  errorCodes,

  valuePath(prefix, key) {
    return `${prefix ? `${prefix}.` : ''}${key}`;
  },

  layoutComponents: [
    'panel',
    'table',
    'well',
    'columns',
    'fieldset',
    'tabs',
  ],

  /*eslint max-depth: ["error", 4]*/
  eachValue(
    components,
    data,
    fn,
    context,
    path = '',
  ) {
    components.forEach((component) => {
      if (component) {
        if (Array.isArray(component.components)) {
          // If tree type is an array of objects like datagrid and editgrid.
          if (['datagrid', 'editgrid', 'dynamicWizard'].includes(component.type) || component.arrayTree) {
            const value = _.get(data, component.key) || [];
            if (Array.isArray(value)) {
              value.forEach((row, index) => {
                this.eachValue(
                  component.components,
                  row,
                  fn,
                  context,
                  this.valuePath(path, `${component.key}[${index}]`),
                );
              });
            }
          }
          else if (['form'].includes(component.type)) {
            this.eachValue(
              component.components,
              _.get(data, `${component.key}.data`, {}),
              fn,
              context,
              this.valuePath(path, `${component.key}.data`),
            );
          }
          else if (
            ['container'].includes(component.type) ||
            (
              component.tree &&
              !this.layoutComponents.includes(component.type)
            )
          ) {
            this.eachValue(
              component.components,
              _.get(data, component.key),
              fn,
              context,
              this.valuePath(path, component.key),
            );
          }
          else if (['tagpad'].includes(component.type)) {
            const value = _.get(data, component.key) || [];
            if (Array.isArray(value)) {
              value.forEach((row, index) => {
                this.eachValue(
                  component.components,
                  row.data,
                  fn,
                  context,
                  this.valuePath(path, `${component.key}.data`),
                );
              });
            }
          }
          else {
            this.eachValue(
              component.components,
              data,
              fn,
              context,
              path,
            );
          }
        }
        else if (Array.isArray(component.columns)) {
          // Handle column like layout components.
          component.columns.forEach((column) => {
            this.eachValue(
              column.components,
              data,
              fn,
              context,
              path,
            );
          });
        }
        else if (Array.isArray(component.rows)) {
          // Handle table like layout components.
          component.rows.forEach((row) => {
            if (Array.isArray(row)) {
              row.forEach((column) => {
                this.eachValue(
                  column.components,
                  data,
                  fn,
                  context,
                  path,
                );
              });
            }
          });
        }
      }

      // Call the callback for each component.
      fn({
        ...context,
        data,
        component,
        path,
      });
    });
  },
  markModifiedParameters: (item, modifiedParameters)=>{
    modifiedParameters.map((parameter)=>{
      if (item[parameter]) {
        item.markModified(parameter);
      }
    });
  },
  // Skips hook execution in case of no hook by provided name found
  // Pass as the last argument to formio.hook.alter() function
  skipHookIfNotExists: () => _.noop(),

  coerceQueryTypes(query, currentForm, prefix = 'data.') {
    _.assign(query, _(query)
      .omit('limit', 'skip', 'select', 'sort', 'populate')
      .mapValues((value, name) => {
      // Skip filters not looking at component data
      if (!name.startsWith(prefix)) {
          return value;
      }

      // Get the filter object.
      const filter = _.zipObject(['name', 'selector'], name.split('__'));
      // Convert to component key
      const key = Utils.getFormComponentKey(filter.name).substring(prefix.length);
      const component = Utils.getComponent(currentForm.components, key);
      // Coerce these queries to proper data type
      if (component) {
        switch (component.type) {
          case 'number':
          case 'currency':
            return Number(value);
          case 'checkbox':
            return value !== 'false';
          case 'datetime': {
            const date = moment.utc(value, ['YYYY-MM-DD', 'YYYY-MM', 'YYYY', 'x', moment.ISO_8601], true);

            if (date.isValid()) {
              return date.toDate();
            }
            return;
          }
          case 'select': {
            if (Number(value) || value === "0") {
              return Number(value);
            }
            return value;
          }
          case 'selectboxes': {
            if (['true', 'false'].includes(value)) {
              return value !== 'false';
            }
          }
        }
      }
      if (!component && ['true', 'false'].includes(value)) {
        return value !== 'false';
      }
      return value;
      }).value());
  }
};

module.exports = Utils;
