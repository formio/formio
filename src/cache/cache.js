'use strict';

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');
var debug = {
  form: require('debug')('formio:cache:form'),
  loadForm: require('debug')('formio:cache:loadForm'),
  loadFormByName: require('debug')('formio:cache:loadFormByName'),
  loadFormByAlias: require('debug')('formio:cache:loadFormByAlias'),
  loadSubmission: require('debug')('formio:cache:loadSubmission')
};

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);

  return {
    cache: function(req) {
      if (!req.formioCache) {
        req.formioCache = hook.alter('cacheInit', {
          names: {},
          aliases: {},
          forms: {},
          submissions: {}
        });
      }
      return req.formioCache;
    },

    /**
     * Update the resource cache.
     *
     * @param req
     * @param result
     */
    updateCache: function (req, cache, result) {
      var formId = result._id.toString();
      if (!formId) {
        return;
      }

      // Set the name cache.
      if (result.name) {
        cache.names[result.name] = formId;
      }

      // Set the alias cache.
      if (result.path) {
        cache.aliases[result.path] = formId;
      }

      // Set the resource cache.
      cache.forms[formId] = result;
    },

    /**
     * Load a form, given its id.
     *
     * @param req {Request}
     * @param type {string}
     * @param id {String}
     * @param cb {function}
     */
    loadForm: function (req, type, id, cb) {
      var cache = this.cache(req);
      if (cache.forms[id]) {
        return cb(null, cache.forms[id]);
      }

      debug.loadForm(typeof id + ': ' + id);
      try {
        id = (typeof id === 'string') ? ObjectId(id) : id;
      }
      catch(e) {
        debug.loadForm(e);
        return cb('Invalid Form Id given.');
      }

      var query = {_id: id, deleted: {$eq: null}};
      if (type) {
        query.type = type;
      }

      router.formio.resources.form.model.findOne(query, function(err, result) {
        if (err) {
          debug.loadForm(err);
          return cb(err);
        }
        if (!result) {
          debug.loadForm('Resource not found for the query: ' + JSON.stringify(query));
          return cb('Resource not found');
        }

        var componentMap = {};
        result = result.toObject();
        _.each(result.components, function (component) {
          componentMap[component.key] = component;
        });
        result.componentMap = componentMap;
        this.updateCache(req, cache, result);
        cb(null, result);
      }.bind(this));
    },

    /**
     * Loads the current form.
     *
     * @param req
     * @param cb
     * @returns {*}
     */
    loadCurrentForm: function(req, cb) {
      var formId = req.formId;
      if (req.params.formId) {
        formId = req.params.formId;
      }
      else if (req.body.data.formId) {
        formId = req.body.data.formId;
      }
      else if (req.query.formId) {
        formId = req.query.formId;
      }
      if (!formId) {
        return cb('No form found.');
      }
      this.loadForm(req, null, formId, cb);
    },

    /**
     * Load a submission using caching.
     *
     * @param req
     * @param formId
     * @param subId
     * @param cb
     * @returns {*}
     */
    loadSubmission: function(req, formId, subId, cb) {
      var cache = this.cache(req);
      if (cache.submissions[subId]) {
        return cb(null, cache.submissions[subId]);
      }

      debug.loadSubmission(typeof formId + ': ' + formId);
      try {
        formId = (typeof formId === 'string') ? ObjectId(formId) : formId;
      }
      catch(e) {
        debug.loadSubmission(e);
        return cb('Invalid Form Id given.');
      }

      debug.loadSubmission(typeof subId + ': ' + subId);
      try {
        subId = (typeof subId === 'string') ? ObjectId(subId) : subId;
      }
      catch(e) {
        debug.loadSubmission(e);
        return cb('Invalid Submission Id given.');
      }

      router.formio.resources.submission.model.findOne({_id: subId, form: formId, deleted: {$eq: null}})
        .exec(function(err, submission) {
          if (err) {
            return cb(err);
          }
          if (!submission) {
            return cb(null, null);
          }

          submission = submission.toObject();
          cache.submissions[subId] = submission;
          cb(null, submission);
        });
    },

    /**
     * Load a submission into the request.
     *
     * @param req
     * @param cb
     */
    loadCurrentSubmission: function(req, cb) {
      if (!req.params.submissionId) {
        return cb(new Error('No submission found.'));
      }
      if (!req.params.formId) {
        return cb(new Error('No form provided'));
      }
      this.loadSubmission(req, req.params.formId, req.params.submissionId, cb);
    },

    /**
     * Load a resource by name.
     *
     * @param req {Object}
     *   The Express request object.
     * @param name {String}
     *   The resource name to search for.
     * @param cb {Function}
     *   The callback function to run when complete.
     */
    loadFormByName: function(req, name, cb) {
      var cache = this.cache(req);
      if (cache.names[name]) {
        this.loadForm(req, 'resource', cache.names[name], cb);
      }
      else {
        var query = hook.alter('formQuery', {
          name: name,
          deleted: {$eq: null}
        }, req);

        router.formio.resources.form.model.findOne(query).exec(function(err, result) {
          if (err) {
            debug.loadFormByName(err);
            return cb(err);
          }
          if (!result) {
            debug.loadFormByName('Resource not found for the query: ' + JSON.stringify(query));
            return cb('Resource not found');
          }

          result = result.toObject();
          this.updateCache(req, cache, result);
          cb(null, result);
        }.bind(this));
      }
    },

    /**
     * Load a resource by alias
     */
    loadFormByAlias: function(req, alias, cb) {
      var cache = this.cache(req);
      if (cache.aliases[alias]) {
        this.loadForm(req, 'resource', cache.aliases[alias], cb);
      }
      else {
        var query = hook.alter('formQuery', {
          path: alias,
          deleted: {$eq: null}
        }, req);

        router.formio.resources.form.model.findOne(query).exec(function(err, result) {
          if (err) {
            debug.loadFormByAlias(err);
            return cb(err);
          }
          if (!result) {
            debug.loadFormByAlias('Resource not found for the query: ' + JSON.stringify(query));
            return cb('Resource not found');
          }

          result = result.toObject();
          this.updateCache(req, cache, result);
          cb(null, result);
        }.bind(this));
      }
    }
  };
};
