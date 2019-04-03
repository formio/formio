'use strict';
const async = require('async');

const debug = {
  form: require('debug')('formio:cache:form'),
  loadForm: require('debug')('formio:cache:loadForm'),
  loadFormByName: require('debug')('formio:cache:loadFormByName'),
  loadFormByAlias: require('debug')('formio:cache:loadFormByAlias'),
  loadSubmission: require('debug')('formio:cache:loadSubmission'),
  loadSubmissions: require('debug')('formio:cache:loadSubmissions'),
  error: require('debug')('formio:error')
};

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  const util = router.formio.util;

  return {
    cache(req) {
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
    updateCache(req, cache, result) {
      const formId = result._id.toString();
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
    loadForm(req, type, id, cb) {
      const cache = this.cache(req);
      if (cache.forms[id]) {
        debug.loadForm(`Cache hit: ${id}`);
        return cb(null, cache.forms[id]);
      }

      debug.loadForm(`${typeof id}: ${id}`);
      id = util.idToBson(id);
      if (id === false) {
        return cb('Invalid form _id given.');
      }

      const query = {_id: id, deleted: {$eq: null}};
      if (type) {
        query.type = type;
      }

      router.formio.resources.form.model.findOne(
        hook.alter('formQuery', query, req)
      ).lean().exec((err, result) => {
        if (err) {
          debug.loadForm(err);
          return cb(err);
        }
        if (!result) {
          debug.loadForm('Resource not found for the query');
          return cb('Resource not found');
        }

        this.updateCache(req, cache, result);
        debug.loadForm('Caching result');
        cb(null, result);
      });
    },

    /**
     * Loads an array of form ids.
     *
     * @param req
     * @param ids
     * @param cb
     */
    loadForms(req, ids, cb) {
      if (!ids || !ids.length) {
        // Shortcut if no ids are provided.
        return cb(null, []);
      }

      router.formio.resources.form.model.find(
        hook.alter('formQuery', {
          _id: {$in: ids.map((formId) => util.idToBson(formId))},
          deleted: {$eq: null}
        }, req)
      ).lean().exec((err, result) => {
        if (err) {
          debug.loadForms(err);
          return cb(err);
        }
        if (!result || !result.length) {
          return cb(null, []);
        }

        cb(null, result);
      });
    },

    getCurrentFormId(req) {
      let formId = req.formId;
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
        return '';
      }
      req.formId = formId;
      return formId;
    },

    /**
     * Loads the current form.
     *
     * @param req
     * @param cb
     * @returns {*}
     */
    loadCurrentForm(req, cb) {
      const formId = this.getCurrentFormId(req);
      if (!formId) {
        return cb('No form found.');
      }
      this.loadForm(req, null, formId, cb);
    },

    /**
     * Load a submission using caching.
     *
     * @param req {Object}
     *   The Express request object.
     * @param formId {Object|String}
     *   The submission form id, as BSON or string.
     * @param subId {Object|String}
     *   The submission id, as BSON or string.
     * @param cb {Function}
     *   The callback function to invoke after loading the submission.
     */
    loadSubmission(req, formId, subId, cb) {
      const cache = this.cache(req);
      if (cache.submissions[subId]) {
        debug.loadSubmission(`Cache hit: ${subId}`);
        return cb(null, cache.submissions[subId]);
      }

      subId = util.idToBson(subId);
      if (subId === false) {
        return cb('Invalid submission _id given.');
      }

      formId = util.idToBson(formId);
      if (formId === false) {
        return cb('Invalid form _id given.');
      }

      debug.loadSubmission(`Searching for form: ${formId}, and submission: ${subId}`);
      const query = {_id: subId, form: formId, deleted: {$eq: null}};
      debug.loadSubmission(query);
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      submissionModel.findOne(hook.alter('submissionQuery', query, req)).lean().exec((err, submission) => {
        if (err) {
          debug.loadSubmission(err);
          return cb(err);
        }
        if (!submission) {
          debug.loadSubmission('No submission found for the given query.');
          return cb(null, null);
        }

        cache.submissions[subId] = submission;
        cb(null, submission);
      });
    },

    /**
     * Load an array of submissions.
     *
     * @param req
     * @param subs
     * @param cb
     */
    loadSubmissions(req, subs, cb) {
      if (!subs || !subs.length) {
        // Shortcut if no subs are provided.
        return cb(null, []);
      }

      const query = {
        _id: {$in: subs.map((subId) => util.idToBson(subId))},
        deleted: {$eq: null}
      };
      debug.loadSubmissions(query);
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      submissionModel.find(hook.alter('submissionQuery', query, req)).lean().exec((err, submissions) => {
        if (err) {
          debug.loadSubmissions(err);
          return cb(err);
        }
        if (!submissions) {
          return cb(null, []);
        }

        cb(null, submissions);
      });
    },

    /**
     * Load a submission into the request.
     *
     * @param req
     * @param cb
     */
    loadCurrentSubmission(req, cb) {
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
    loadFormByName(req, name, cb) {
      const cache = this.cache(req);
      if (cache.names[name]) {
        debug.loadFormByName(`Cache hit: ${name}`);
        this.loadForm(req, 'resource', cache.names[name], cb);
      }
      else {
        const query = hook.alter('formQuery', {
          name: name,
          deleted: {$eq: null}
        }, req);

        router.formio.resources.form.model.findOne(query).lean().exec((err, result) => {
          if (err) {
            debug.loadFormByName(err);
            return cb(err);
          }
          if (!result) {
            return cb('Resource not found');
          }

          this.updateCache(req, cache, result);
          cb(null, result);
        });
      }
    },

    /**
     * Load a resource by alias
     */
    loadFormByAlias(req, alias, cb) {
      const cache = this.cache(req);
      if (cache.aliases[alias]) {
        debug.loadFormByAlias(`Cache hit: ${alias}`);
        this.loadForm(req, 'resource', cache.aliases[alias], cb);
      }
      else {
        const query = hook.alter('formQuery', {
          path: alias,
          deleted: {$eq: null}
        }, req);

        router.formio.resources.form.model.findOne(query).lean().exec((err, result) => {
          if (err) {
            debug.loadFormByAlias(err);
            return cb(err);
          }
          if (!result) {
            return cb('Resource not found');
          }

          this.updateCache(req, cache, result);
          cb(null, result);
        });
      }
    },

    /**
     * Load all subforms in a form recursively.
     *
     * @param form
     * @param req
     * @param next
     * @param depth
     * @returns {*}
     */
    loadSubForms(form, req, next, depth, forms) {
      depth = depth || 0;
      forms = forms || {};

      // Only allow 5 deep.
      if (depth >= 5) {
        return next();
      }

      // Get all of the form components.
      const comps = {};
      const formIds = [];
      util.eachComponent(form.components, function(component) {
        if ((component.type === 'form') && component.form) {
          const formId = component.form.toString();
          if (!comps[formId]) {
            comps[formId] = [];
            formIds.push(formId);
          }
          comps[formId].push(component);
        }
      }, true);

      // Only proceed if we have form components.
      if (!formIds.length) {
        return next();
      }

      // Load all subforms in this form.
      this.loadForms(req, formIds, (err, result) => {
        if (err) {
          return next();
        }

        // Iterate through all subforms.
        async.each(result, (subForm, done) => {
          const formId = subForm._id.toString();
          if (forms[formId] || !comps[formId]) {
            return done();
          }
          forms[formId] = true;
          comps[formId].forEach((comp) => (comp.components = subForm.components));
          this.loadSubForms(subForm, req, done, depth + 1, forms);
        }, next);
      });
    }
  };
};
