'use strict';

const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');
const nodeUrl = require('url');
const Q = require('q');
const formioUtils = require('formiojs/utils');
const deleteProp = require('delete-property').default;
const debug = {
  idToBson: require('debug')('formio:util:idToBson'),
  getUrlParams: require('debug')('formio:util:getUrlParams'),
  removeProtectedFields: require('debug')('formio:util:removeProtectedFields')
};

const Utils = {
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
   * Create a sub-request object from the original request.
   *
   * @param req
   */
  createSubRequest(req) {
    // Determine how many child requests have been made.
    let childRequests = req.childRequests || 0;

    // Break recursive child requests.
    if (childRequests > 5) {
      return null;
    }

    // Save off formio for fast cloning...
    const cache = req.formioCache;
    delete req.formioCache;

    // Clone the request.
    const childReq = _.cloneDeep(req);

    // Add the parameters back.
    childReq.formioCache = cache;
    childReq.user = req.user;
    childReq.modelQuery = null;
    childReq.countQuery = null;
    childReq.childRequests = ++childRequests;
    childReq.permissionsChecked = false;

    // Delete the actions cache.
    delete childReq.actions;

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
  eachComponent: formioUtils.eachComponent,

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
  getComponent: formioUtils.getComponent,

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
  flattenComponents: formioUtils.flattenComponents,

  /**
   * Get the value for a component key, in the given submission.
   *
   * @param {Object} submission
   *   A submission object to search.
   * @param {String} key
   *   A for components API key to search for.
   */
  getValue: formioUtils.getValue,

  /**
   * Determine if a component is a layout component or not.
   *
   * @param {Object} component
   *   The component to check.
   *
   * @returns {Boolean}
   *   Whether or not the component is a layout component.
   */
  isLayoutComponent: formioUtils.isLayoutComponent,

  /**
   * Apply JSON logic functionality.
   *
   * @param component
   * @param row
   * @param data
   */
  jsonLogic: formioUtils.jsonLogic,

  /**
   * Check if the condition for a component is true or not.
   *
   * @param component
   * @param row
   * @param data
   */
  checkCondition: formioUtils.checkCondition,

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
        : mongoose.Types.ObjectId(id);
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
    if (typeof req.headers[key] !== 'undefined') {
      return req.headers[key];
    }

    return false;
  },

    flattenComponentsForRender(components) {
      const flattened = {};
      this.eachComponent(components, function(component, path) {
        // Containers will get rendered as flat.
        if (
          (component.type === 'container') ||
          (component.type === 'button') ||
          (component.type === 'hidden')
        ) {
          return;
        }

        flattened[path] = component;

        if (component.type === 'datagrid') {
          return true;
        }
      });
      return flattened;
    },

  renderFormSubmission(data, components) {
    const comps = this.flattenComponentsForRender(components);
    let submission = '<table border="1" style="width:100%">';
    _.each(comps, function(component, key) {
      const cmpValue = this.renderComponentValue(data, key, comps);
      if (typeof cmpValue.value === 'string') {
        submission += '<tr>';
        submission += `<th style="padding: 5px 10px;">${cmpValue.label}</th>`;
        submission += `<td style="width:100%;padding:5px 10px;">${cmpValue.value}</td>`;
        submission += '</tr>';
      }
    }.bind(this));
    submission += '</table>';
    return submission;
  },

  /**
   * Renders a specific component value, which is also able
   * to handle Containers, Data Grids, as well as other more advanced
   * components such as Signatures, Dates, etc.
   *
   * @param data
   * @param key
   * @param components
   * @returns {{label: *, value: *}}
   */
  /* eslint-disable max-statements */
  renderComponentValue(data, key, components) {
    let value = _.get(data, key);
    if (!value) {
      value = '';
    }
    const compValue = {
      label: key,
      value: value
    };
    if (!components.hasOwnProperty(key)) {
      return compValue;
    }
    const component = components[key];
    compValue.label = component.label || component.placeholder || component.key;
    if (component.multiple) {
      components[key].multiple = false;
      compValue.value = _.map(value, function(subValue) {
        const subValues = {};
        subValues[key] = subValue;
        return this.renderComponentValue(subValues, key, components).value;
      }.bind(this)).join(', ');
      return compValue;
    }

    switch (component.type) {
      case 'password':
        compValue.value = '--- PASSWORD ---';
        break;
      case 'address':
        compValue.value = compValue.value ? compValue.value.formatted_address : '';
        break;
      case 'signature':
        // For now, we will just email YES or NO until we can make signatures work for all email clients.
        compValue.value = ((typeof value === 'string') && (value.indexOf('data:') === 0)) ? 'YES' : 'NO';
        break;
      case 'container':
        compValue.value = '<table border="1" style="width:100%">';
        _.each(value, function(subValue, subKey) {
          const subCompValue = this.renderComponentValue(value, subKey, components);
          if (typeof subCompValue.value === 'string') {
            compValue.value += '<tr>';
            compValue.value += `<th style="text-align:right;padding: 5px 10px;">${subCompValue.label}</th>`;
            compValue.value += `<td style="width:100%;padding:5px 10px;">${subCompValue.value}</td>`;
            compValue.value += '</tr>';
          }
        }.bind(this));
        compValue.value += '</table>';
        break;
      case 'datagrid': {
        const columns = this.flattenComponentsForRender(component.components);
        compValue.value = '<table border="1" style="width:100%">';
        compValue.value += '<tr>';
        _.each(columns, function(column) {
          const subLabel = column.label || column.key;
          compValue.value += `<th style="padding: 5px 10px;">${subLabel}</th>`;
        });
        compValue.value += '</tr>';
        _.each(value, function(subValue) {
          compValue.value += '<tr>';
          _.each(columns, function(column, key) {
            const subCompValue = this.renderComponentValue(subValue, key, columns);
            if (typeof subCompValue.value === 'string') {
              compValue.value += '<td style="padding:5px 10px;">';
              compValue.value += subCompValue.value;
              compValue.value += '</td>';
            }
          }.bind(this));
          compValue.value += '</tr>';
        }.bind(this));
        compValue.value += '</table>';
        break;
      }
      case 'datetime': {
        let dateFormat = '';
        if (component.enableDate) {
          dateFormat = component.format.toUpperCase();
        }
        if (component.enableTime) {
          dateFormat += ' hh:mm:ss A';
        }
        if (dateFormat) {
          compValue.value = moment(value).format(dateFormat);
        }
        break;
      }
      case 'radio':
      case 'select': {
        let values = [];
        if (component.hasOwnProperty('values')) {
          values = component.values;
        }
        else if (component.hasOwnProperty('data') && component.data.values) {
          values = component.data.values;
        }
        for (const i in values) {
          const subCompValue = values[i];
          if (subCompValue.value === value) {
            compValue.value = subCompValue.label;
            break;
          }
        }
        break;
      }
      case 'selectboxes': {
        const selectedValues = [];
        for (const j in component.values) {
          const selectBoxValue = component.values[j];
          if (value[selectBoxValue.value]) {
            selectedValues.push(selectBoxValue.label);
          }
        }
        compValue.value = selectedValues.join(',');
        break;
      }
      default:
        if (!component.input) {
          return {value: false};
        }
        break;
    }

    if (component.protected) {
      compValue.value = '--- PROTECTED ---';
    }

    // Ensure the value is a string.
    compValue.value = compValue.value ? compValue.value.toString() : '';
    return compValue;
  },
  /* eslint-enable max-statements */

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
    if (typeof req.query[key] !== 'undefined') {
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
    if (typeof req.params[key] !== 'undefined') {
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
      urlParams[parts[a]] = parts[a + 1];
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
   * A promisified version of request. Use this if you need
   * to be able to mock requests for tests, as it's much easier
   * to mock this than the individual required 'request' modules
   * in each file.
   */
  request: Q.denodeify(require('request')),

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
        : mongoose.Types.ObjectId(_id);
    }
    catch (e) {
      debug.idToBson(`Unknown _id given: ${_id}, typeof: ${typeof _id}`);
      _id = false;
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

  removeProtectedFields(form, action, submissions) {
    if (!(submissions instanceof Array)) {
      submissions = [submissions];
    }

    // Initialize our delete fields array.
    const modifyFields = [];

    // Iterate through all components.
    this.eachComponent(form.components, function(component, path) {
      path = `data.${path}`;
      if (component.protected) {
        debug.removeProtectedFields('Removing protected field:', component.key);
        modifyFields.push(deleteProp(path));
      }
      else if ((component.type === 'signature') && (action === 'index')) {
        modifyFields.push((function(fieldPath) {
          return function(sub) {
            const data = _.get(sub, fieldPath);
            _.set(sub, fieldPath, (!data || (data.length < 25)) ? '' : 'YES');
          };
        })(path));
      }
    }.bind(this), true);

    // Iterate through each submission once.
    if (modifyFields.length > 0) {
      _.each(submissions, function(submission) {
        _.each(modifyFields, function(modifyField) {
          modifyField(submission);
        });
      });
    }
  },

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
      return new Buffer(decoded.toString()).toString('base64');
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
      return new Buffer(encoded.toString()).toString('ascii');
    }
  },

  /**
   * Retrieve a unique machine name
   *
   * @param document
   * @param model
   * @param machineName
   * @param next
   * @return {*}
   */
  uniqueMachineName(document, model, next) {
    model.find({
      machineName: {"$regex": document.machineName},
      deleted: {$eq: null}
    }, (err, records) => {
      if (err) {
        return next(err);
      }

      if (!records || !records.length) {
        return next();
      }

      let i = 0;
      records.forEach((record) => {
        const parts = record.machineName.split(/(\d+)/).filter(Boolean);
        const number = parts[1] || 0;
        if (number > i) {
          i = number;
        }
      });
      document.machineName += ++i;
      next();
    });
  }
};

module.exports = Utils;
