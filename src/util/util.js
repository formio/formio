'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var nodeUrl = require('url');
var Q = require('q');
var formioUtils = require('formio-utils');
var deleteProp = require('delete-property');
var debug = {
  getUrlParams: require('debug')('formio:util:getUrlParams'),
  removeProtectedFields: require('debug')('formio:util:removeProtectedFields')
};

module.exports = {
  /**
   * A wrapper around console.log that gets ignored by eslint.
   *
   * @param {*} content
   *   The content to pass to console.log.
   */
  log: function(content) {
    /* eslint-disable */
    console.log(content);
    /* eslint-enable */
  },

  /**
   * A wrapper around console.error that gets ignored by eslint.
   *
   * @param {*} content
   *   The content to pass to console.error.
   */
  error: function(content) {
    /* eslint-disable */
    console.error(content);
    /* eslint-enable */
  },

  /**
   * Returns the URL alias for a form provided the url.
   */
  getAlias: function(req, reservedForms) {
    var formsRegEx = new RegExp('\/(' + reservedForms.join('|') + ').*', 'i');
    var alias = req.url.substr(1).replace(formsRegEx, '');
    var additional = req.url.substr(alias.length + 1);
    if (!additional && req.method === 'POST') {
      additional = '/submission';
    }
    return {
      alias: alias,
      additional: additional
    };
  },

  /**
   * Create a sub-request object from the original request.
   *
   * @param req
   */
  createSubRequest: function(req) {
    // Save off formio for fast cloning...
    var cache = req.formioCache;
    delete req.formioCache;

    // Clone the request.
    var childReq = _.clone(req, true);

    // Add the parameters back.
    childReq.formioCache = cache;
    childReq.user = req.user;
    childReq.modelQuery = null;
    childReq.countQuery = null;

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
   * @param components
   * @param eachComp
   */
  eachComponent: formioUtils.eachComponent,

  /**
   * Get a component by its key
   * @param components
   * @param key The key of the component to get
   * @returns The component that matches the given key, or undefined if not found.
   */
  getComponent: formioUtils.getComponent,

  /**
   * Flatten the form components for data manipulation.
   * @param components
   * @param flattened
   * @returns {*|{}}
   */
  flattenComponents: formioUtils.flattenComponents,

  /**
   * Return the objectId.
   *
   * @param id
   * @returns {*}
   * @constructor
   */
  ObjectId: function(id) {
    return _.isObject(id)
      ? id
      : mongoose.Types.ObjectId(id);
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
  getHeader: function(req, key) {
    if (typeof req.headers[key] !== 'undefined') {
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
  getQuery: function(req, key) {
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
  getParameter: function(req, key) {
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
  getRequestValue: function(req, key) {
    var ret = null;

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
  getUrlParams: function(url) {
    var urlParams = {};
    if (!url) {
      return urlParams;
    }
    var parsed = nodeUrl.parse(url);
    var parts = parsed.pathname.split('/');
    debug.getUrlParams(parsed);

    // Remove element originating from first slash.
    parts = _.rest(parts);

    // Url is not symmetric, add an empty value for the last key.
    if ((parts.length % 2) !== 0) {
      parts.push('');
    }

    // Build key/value list.
    for (var a = 0; a < parts.length; a += 2) {
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
  getSubmissionKey: function(key) {
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
  getFormComponentKey: function(key) {
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
  idToBson: function(_id) {
    return _.isObject(_id)
      ? _id
      : mongoose.Types.ObjectId(_id);
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
  idToString: function(_id) {
    return _.isObject(_id)
      ? _id.toString()
      : _id;
  },

  removeProtectedFields: function(form, action, submissions) {
    if (!(submissions instanceof Array)) {
      submissions = [submissions];
    }

    // Initialize our delete fields array.
    var modifyFields = [];

    // Iterate through all components.
    this.eachComponent(form.components, function(component, path) {
      path = 'data.' + path;
      if (component.protected) {
        debug.removeProtectedFields('Removing protected field:', component.key);
        modifyFields.push(deleteProp(path));
      }
      else if ((component.type === 'signature') && (action === 'index')) {
        modifyFields.push((function(fieldPath) {
          return function(sub) {
            var data = _.get(sub, fieldPath);
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
  }
};
