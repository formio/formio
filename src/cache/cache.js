'use strict';
const async = require('async');
const _ = require('lodash');
const debug = {
  form: require('debug')('formio:cache:form'),
  loadForm: require('debug')('formio:cache:loadForm'),
  loadFormAsync: require('debug')('formio:cache:loadFormAsync'),
  loadForms: require('debug')('formio:cache:loadForms'),
  loadFormsAsync: require('debug')('formio:cache:loadFormsAsync'),
  loadFormByName: require('debug')('formio:cache:loadFormByName'),
  loadFormByNameAsync: require('debug')('formio:cache:loadFormByNameAsync'),
  loadFormByAlias: require('debug')('formio:cache:loadFormByAlias'),
  loadFormByAliasAsync: require('debug')('formio:cache:loadFormByAliasAsync'),
  loadSubmission: require('debug')('formio:cache:loadSubmission'),
  loadSubmissionAsync: require('debug')('formio:cache:loadSubmissionAsync'),
  loadSubmissions: require('debug')('formio:cache:loadSubmissions'),
  loadSubmissionsAsync: require('debug')('formio:cache:loadSubmissionsAsync'),
  loadSubForms: require('debug')('formio:cache:loadSubForms'),
  loadSubFormsAsync: require('debug')('formio:cache:loadSubFormsAsync'),
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
          submissions: {},
          submissionRevisions: {}
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

        hook.alter('loadForm', result, req, (err, result) => {
          if (err) {
            debug.loadForm(err);
            return cb(err);
          }
          this.updateCache(req, cache, result);
          debug.loadForm('Caching result');
          cb(null, result);
        });
      });
    },

    /**
     * Load a form, given its id.
     *
     * @param req {Request}
     * @param type {string}
     * @param id {String}
     */
    async loadFormAsync(req, type, id) {
      const cache = this.cache(req);

      if (cache.forms[id]) {
        debug.loadFormAsync(`Cache hit: ${id}`);
        return cache.forms[id];
      }

      debug.loadFormAsync(`${typeof id}: ${id}`);

      const query = {
        _id: util.idToBson(id),
        deleted: {$eq: null}
      };

      if (type) {
        query.type = type;
      }

      let form = await router.formio.resources.form.model.findOne(
        hook.alter('formQuery', query, req)
      ).lean().exec();

      if (!form) {
        debug.loadFormAsync('Resource not found for the query');
        return null;
      }

      form = await hook.alter('loadForm', form, req);

      debug.loadForm('Caching result');
      this.updateCache(req, cache, form);

      return form;
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

    /**
     * Loads an array of forms for provided array with ids.
     *
     * @param req {Request}
     * @param formIds {Array}
     * @returns Array
     */
    async loadFormsAsync(req, formIds) {
      if (!Array.isArray(formIds)) {
        throw new Error('Expected to receive an array of form ids');
      }

      if (!formIds.length) {
        // Shortcut if no form ids are provided.
        return [];
      }

      const query = {
        _id: {$in: formIds.map(util.idToBson)},
        deleted: {$eq: null}
      };

      const forms = await router.formio.resources.form.model.find(
        hook.alter('formQuery', query, req)
      ).lean().exec();

      if (!forms || !forms.length) {
        return [];
      }

      return forms;
    },

    loadFormRevisions(req, revs, cb) {
      if (!revs || !revs.length || !router.formio.resources.formrevision) {
        debug.loadSubForms(`Form revisions not used.`);
        return cb();
      }

      const formRevs = {};
      async.each(revs, (rev, next) => {
        const formRevision = rev.revision || rev.formRevision;
        debug.loadSubForms(`Loading form ${util.idToBson(rev.form)} revision ${formRevision}`);
        const loadRevision = formRevision.length === 24 ? router.formio.resources.formrevision.model.findOne(
            {_id: util.idToBson(rev.revision)}
        ) :
        router.formio.resources.formrevision.model.findOne(
          hook.alter('formQuery', {
            _rid: util.idToBson(rev.form),
            _vid: parseInt(formRevision),
            deleted: {$eq: null}
          }, req)
        );

        loadRevision.lean().exec((err, result) => {
          if (err) {
            debug.loadSubForms(err);
            return next(err);
          }
          if (!result) {
            debug.loadSubForms(
              `Cannot find form revision for form ${rev.form} revision ${formRevision}`,
            );
            return next();
          }

          debug.loadSubForms(`Loaded revision for form ${rev.form} revision ${formRevision}`);
          formRevs[rev.form.toString()] = result;
          next();
        });
      }, (err) => {
        if (err) {
          debug.loadSubForms(err);
          debug.loadFormRevisions(err);
          return cb(err);
        }

        cb(null, formRevs);
      });
    },

    async loadFormRevisionsAsync(req, revs) {
      if (!Array.isArray(revs)) {
        throw new Error('Expected to receive an array of form revisions');
      }

      if (!revs.length || !router.formio.resources.formrevision) {
        debug.loadSubFormsAsync('Form revisions not used.');
        return;
      }

      const revisionModel = router.formio.resources.formrevision.model;
      const formRevs = {};

      for (const rev of revs) {
        const formRevision = rev.revision || rev.formRevision;
        debug.loadSubFormsAsync(`Loading form ${util.idToBson(rev.form)} revision ${formRevision}`);
        const query =
          formRevision.length === 24
            ? {_id: util.idToBson(rev.revision)}
            : hook.alter(
                'formQuery',
                {
                  _rid: util.idToBson(rev.form),
                  _vid: parseInt(formRevision),
                  deleted: {$eq: null}
                },
                req
              );

        const revision = await revisionModel.findOne(query).lean().exec();

        if (!revision) {
          debug.loadSubFormsAsync(
            `Cannot find form revision for form ${rev.form} revision ${formRevision}`,
          );
          continue;
        }

        debug.loadSubFormsAsync(`Loaded revision for form ${rev.form} revision ${formRevision}`);
        formRevs[rev.form.toString()] = revision;
      }

      return formRevs;
    },

    getCurrentFormId(req) {
      let formId = req.formId;
      if (req.params.formId) {
        formId = req.params.formId;
        if (req.params.submissionId) {
          req.subId = req.params.submissionId;
        }
      }
      else if (req.body.data && req.body.data.formId) {
        formId = req.body.data.formId;
      }
      else if (req.query.formId) {
        formId = req.query.formId;
      }
      if (!formId) {
        return '';
      }
      req.formId = formId;
      req.params.formId = formId;
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
     * Loads the current form.
     *
     * @param req
     * @returns {*}
     */
    async loadCurrentFormAsync(req) {
      const formId = this.getCurrentFormId(req);

      if (!formId) {
        throw new Error('No form id provided.');
      }

      return await this.loadFormAsync(req, null, formId);
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

        hook.alter('loadSubmission', submission, req, (err, submission) => {
          if (err) {
            debug.loadSubmission(err);
            return cb(err);
          }
          cache.submissions[subId] = submission;
          cb(null, submission);
        });
      });
    },

    /**
     * Load a submission using caching async.
     *
     * @param req {Object}
     *   The Express request object.
     * @param formId {Object|String}
     *   The submission form id, as BSON or string.
     * @param subId {Object|String}
     *   The submission id, as BSON or string.
     */
    async loadSubmissionAsync(req, formId, subId) {
      const cache = this.cache(req);

      if (cache.submissions[subId]) {
        debug.loadSubmissionAsync(`Cache hit: ${subId}`);
        return cache.submissions[subId];
      }

      debug.loadSubmissionAsync(`Searching for form: ${formId}, and submission: ${subId}`);
      const query = {
        _id: util.idToBson(subId),
        form: util.idToBson(formId),
        deleted: {$eq: null}
      };
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;

      try {
        let submission = await submissionModel.findOne(hook.alter('submissionQuery', query, req)).lean().exec();

        if (!submission) {
          debug.loadSubmissionAsync('No submission found for the given query.');
          return null;
        }

        submission = await hook.alter('loadSubmission', submission, req);

        cache.submissions[subId] = submission;

        return submission;
      }
      catch (err) {
        debug.loadSubmissionAsync(err);
        throw new Error(err);
      }
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
     * Load an array of submissions.
     *
     * @param req {Request}
     * @param subs {Array}
     */
    async loadSubmissionsAsync(req, subs) {
      if (!Array.isArray(subs)) {
        throw new Error('Expected to receive an array of submission ids');
      }

      if (!subs || !subs.length) {
        // Shortcut if no subs are provided.
        return [];
      }

      const query = {
        _id: {$in: subs.map(util.idToBson)},
        deleted: {$eq: null}
      };
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;

      const submissions = await submissionModel.find(hook.alter('submissionQuery', query, req)).lean().exec();

      if (!submissions) {
        return [];
      }

      return submissions;
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
     * Load a submission into the request.
     *
     * @param req
     */
    async loadCurrentSubmissionAsync(req) {
      const {formId, submissionId} = req.params;

      if (!formId) {
        throw new Error('No form id provided.');
      }

      if (!submissionId) {
        throw new Error('No submission id provided.');
      }

      return await this.loadSubmissionAsync(req, req.params.formId, req.params.submissionId);
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

          hook.alter('loadForm', result, req, (err, result) => {
            if (err) {
              debug.loadForm(err);
              return cb(err);
            }
            this.updateCache(req, cache, result);
            debug.loadForm('Caching result');
            cb(null, result);
          });
        });
      }
    },

    /**
     * Load a resource by name.
     *
     * @param req {Object}
     *   The Express request object.
     * @param name {String}
     *   The resource name to search for.
     */
    async loadFormByNameAsync(req, name) {
      const cache = this.cache(req);

      if (cache.names[name]) {
        debug.loadFormByNameAsync(`Cache hit: ${name}`);
        return await this.loadFormAsync(req, 'resource', cache.names[name]);
      }
      else {
        const query = hook.alter('formQuery', {
          name: name,
          deleted: {$eq: null}
        }, req);

        let form = await router.formio.resources.form.model.findOne(query).lean().exec();

        if (!form) {
          debug.loadFormByNameAsync('Resource not found for the query');
          return null;
        }

        form = await hook.alter('loadForm', form, req);

        debug.loadFormByNameAsync('Caching result');
        this.updateCache(req, cache, form);

        return form;
      }
    },

    /**
     * Load a resource by alias
     *
     * @param req {Request}
     *   The Express request object.
     * @param alias {String}
     *   The resource alias to search for.
     * @param cb {Function}
     *   The callback function to run when complete.
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

          hook.alter('loadForm', result, req, (err, result) => {
            if (err) {
              debug.loadForm(err);
              return cb(err);
            }
            this.updateCache(req, cache, result);
            debug.loadForm('Caching result');
            cb(null, result);
          });
        });
      }
    },

    /**
     * Load a resource by alias
     *
     * @param req {Request}
     *   The Express request object.
     * @param alias {String}
     *   The resource alias to search for.
     */
    async loadFormByAliasAsync(req, alias) {
      const cache = this.cache(req);

      if (cache.aliases[alias]) {
        debug.loadFormByAliasAsync(`Cache hit: ${alias}`);
        return await this.loadFormAsync(req, 'resource', cache.aliases[alias]);
      }
      else {
        const query = hook.alter('formQuery', {
          path: alias,
          deleted: {$eq: null}
        }, req);

        let form = await router.formio.resources.form.model.findOne(query).lean().exec();

        if (!form) {
          debug.loadFormByAliasAsync('Resource not found for the query');
          return null;
        }

        form = await hook.alter('loadForm', form, req);

        debug.loadFormByAliasAsync('Caching result');
        this.updateCache(req, cache, form);

        return form;
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
    loadAllForms(form, req, next, depth, forms) {
      depth = depth || 0;
      forms = forms || {};
      debug.loadSubForms(`Loading subforms for ${form._id}`);

      // Only allow 5 deep.
      if (depth >= 5) {
        return next();
      }

      // Get all of the form components.
      const formIds = [];
      const formRevs = [];
      util.eachComponent(form.components, function(component) {
        if ((component.type === 'form') && component.form) {
          const formId = component.form.toString();
          formIds.push(formId);
          debug.loadSubForms(`Found subform ${formId}`);
          // 'formRevision' was used in the older builder versions
          if (component.revision || component.formRevision) {
            formRevs.push(component);
          }
        }
      }, true);

      // Only proceed if we have form components.
      if (!formIds.length) {
        return next();
      }

      // Load all subforms in this form.
      debug.loadSubForms(`Loading subforms ${formIds.join(', ')}`);
      this.loadForms(req, formIds, (err, result) => {
        if (err) {
          return next();
        }

        // Load all form revisions.
        this.loadFormRevisions(req, formRevs, (err, revs) => {
          if (err) {
            return next();
          }

          // Iterate through all subforms.
          revs = revs || {};
          async.each(result, (subForm, done) => {
            const formId = subForm._id.toString();
            if (forms[formId]) {
              debug.loadSubForms(`Subforms already loaded for ${formId}.`);
              return done();
            }
            forms[formId] = revs[formId] ? revs[formId] : subForm;
            this.loadAllForms(subForm, req, done, depth + 1, forms);
          }, next);
        });
      });
    },

    /**
     * Load all subforms in a form recursively.
     *
     * @param form
     * @param req
     * @param depth
     * @returns {*}
     */
    async loadAllFormsAsync(form, req, depth = 0, forms = {}) {
      debug.loadSubFormsAsync(`Loading subforms for ${form._id}`);
      // Only allow 5 deep.
      if (depth >= 5) {
        return forms;
      }

      // Get all of the form components.
      const formIds = [];
      const formRevs = [];
      util.eachComponent(form.components, component => {
        if ((component.type === 'form') && component.form) {
          const formId = component.form.toString();

          debug.loadSubFormsAsync(`Found subform ${formId}`);
          formIds.push(formId);
          // 'formRevision' was used in the older builder versions
          if (component.revision || component.formRevision) {
            formRevs.push(component);
          }
        }
      }, true);

      // Only proceed if we have form components.
      if (!formIds.length) {
        return forms;
      }

      // Load all subforms in this form.
      debug.loadSubFormsAsync(`Loading subforms ${formIds.join(', ')}`);
      const subForms = await this.loadFormsAsync(req, formIds);
      const revisions = await this.loadFormRevisionsAsync(req, formRevs);

      for (const form of subForms) {
        const formId = form._id.toString();

        if (forms[formId]) {
          debug.loadSubFormsAsync(`Subforms already loaded for ${formId}.`);
          continue;
        }

        forms[formId] = revisions[formId] ? revisions[formId] : form;
        await this.loadAllFormsAsync(form, req, depth + 1, forms);
      }

      return forms;
    },

    setFormComponents(components, forms) {
      if (components.noRecurse) {
        return;
      }
      components.noRecurse = true;
      util.eachComponent(components, (component) => {
        if ((component.type === 'form') && component.form) {
          const formId = component.form.toString();
          if (forms[formId]) {
            component.components = forms[formId].components;
            this.setFormComponents(component.components, forms);
          }
        }
      }, true);
    },

    loadSubForms(form, req, next) {
      const forms = {};
      this.loadAllForms(form, req, (err) => {
        if (err) {
          return next(err);
        }
        this.setFormComponents(form.components, forms);
        next(null, form);
      }, 0, forms);
    },

    async loadSubFormsAsync(form, req) {
      const forms = await this.loadAllFormsAsync(form, req);

      this.setFormComponents(form.components, forms);
    },

    /**
     * Loads sub submissions from a nested subform hierarchy.
     *
     * @param form
     * @param submission
     * @param req
     * @param next
     * @param depth
     * @return {*}
     */
    loadSubSubmissions(form, submission, req, next, depth) {
      depth = depth || 0;

      // Only allow 5 deep.
      if (depth >= 5) {
        return next();
      }

      // Get all the subform data.
      const subs = {};
      const getSubs = (components, outerPath) => util.eachComponent(components, function(component, path) {
        const subData = _.get(submission.data, path);
        if (Array.isArray(subData)) {
          return subData.forEach((_, idx) => getSubs(component.components, `${path}[${idx}]`));
        }
        if (component.type === 'form' || component.reference) {
          const subData = _.get(submission.data, path);
          if (subData && subData._id) {
            subs[subData._id.toString()] = {component, path, data: subData.data};
          }
        }
      }, true, outerPath);

      getSubs(form.components);

      // Load all the submissions within this submission.
      this.loadSubmissions(req, Object.keys(subs), (err, submissions) => {
        if (err || !submissions || !submissions.length) {
          return next();
        }
        async.eachSeries(submissions, (sub, nextSubmission) => {
          if (!sub || !sub._id) {
            return;
          }
          const subId = sub._id.toString();
          if (subs[subId]) {
            // Set the subform data if it contains more data... legacy renderers don't fare well with sub-data.
            if (!subs[subId].data || (Object.keys(sub.data).length > Object.keys(subs[subId].data).length)) {
              _.set(submission.data, subs[subId].path, sub);
            }

            // Load all subdata within this submission.
            this.loadSubSubmissions(subs[subId].component, sub, req, nextSubmission, depth + 1);
          }
        }, next);
      });
    },

    /**
     * Loads sub submissions from a nested subform hierarchy.
     *
     * @param form
     * @param submission
     * @param req
     * @param depth
     * @return {*}
     */
    async loadSubSubmissionsAsync(form, submission, req, depth = 0) {
      // Only allow 5 deep.
      if (depth >= 5) {
        return submission;
      }

      // Get all the subform data.
      const subs = {};
      const getSubs = (components, outerPath) => util.eachComponent(components, (component, path) => {
        const subData = _.get(submission.data, path);

        if (Array.isArray(subData)) {
          return subData.forEach((_, idx) => getSubs(component.components, `${path}[${idx}]`));
        }

        if (component.type === 'form' || component.reference) {
          const subData = _.get(submission.data, path);

          if (subData && subData._id) {
            subs[subData._id.toString()] = {component, path, data: subData.data};
          }
        }
      }, true, outerPath);

      getSubs(form.components);

      const submissions = await this.loadSubmissionsAsync(req, Object.keys(subs));

      if (!submissions || !submissions.length) {
        return submission;
      }

      for (const sub of submissions) {
        if (!sub || !sub._id) {
          continue;
        }

        const subId = sub._id.toString();

        if (subs[subId]) {
          // Set the subform data if it contains more data... legacy renderers don't fare well with sub-data.
          if (!subs[subId].data || (Object.keys(sub.data).length > Object.keys(subs[subId].data).length)) {
            _.set(submission.data, subs[subId].path, sub);
          }

          // Load all subdata within this submission.
          await this.loadSubSubmissionsAsync(subs[subId].component, sub, req, depth + 1);
        }
      }
    }
  };
};
