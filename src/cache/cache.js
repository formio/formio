'use strict';
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const debug = {
  form: require('debug')('formio:cache:form'),
  loadForm: require('debug')('formio:cache:loadForm'),
  loadForms: require('debug')('formio:cache:loadForms'),
  loadFormByName: require('debug')('formio:cache:loadFormByName'),
  loadFormByAlias: require('debug')('formio:cache:loadFormByAlias'),
  loadSubmission: require('debug')('formio:cache:loadSubmission'),
  loadSubmissions: require('debug')('formio:cache:loadSubmissions'),
  loadSubForms: require('debug')('formio:cache:loadSubForms'),
  loadFormRevisions: require('debug')('formio:cache:loadFormRevisions'),
  error: require('debug')('formio:error'),
};

module.exports = function (router) {
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
          submissionRevisions: {},
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
     */
    async loadForm(req, type, id, noCachedResult) {
      const cache = this.cache(req);
      if (!noCachedResult && cache.forms[id]) {
        debug.loadForm(`Cache hit: ${id}`);
        return cache.forms[id];
      }

      debug.loadForm(`${typeof id}: ${id}`);
      id = util.idToBson(id);
      if (id === false) {
        throw new Error('Invalid form _id given.');
      }

      const query = { _id: id, deleted: { $eq: null } };
      if (type) {
        query.type = type;
      }

      try {
        const result = await router.formio.resources.form.model
          .findOne(await hook.alter('formQuery', query, req))
          .lean()
          .exec();
        if (!result) {
          debug.loadForm('Resource not found for the query');
          throw new Error('Resource not found');
        }

        const finalResult = await hook.alter('loadForm', result, req);
        this.updateCache(req, cache, finalResult);
        debug.loadForm('Caching result');
        return finalResult;
      } catch (err) {
        debug.loadForm(err);
        throw new Error(err);
      }
    },

    /**
     * Loads an array of form ids.
     *
     * @param req
     * @param ids
     */
    async loadForms(req, ids) {
      if (!ids || !ids.length) {
        // Shortcut if no ids are provided.
        return [];
      }

      // Use whatever forms are already cached and only look up the rest.
      const cache = this.cache(req);
      const cached = [];
      const missingIds = [];
      ids.forEach((id) => {
        const form = cache.forms[id];
        if (form) {
          cached.push(form);
        } else {
          missingIds.push(id);
        }
      });

      if (!missingIds.length) return cached;

      try {
        const result = await router.formio.resources.form.model
          .find(
            await hook.alter(
              'formQuery',
              {
                _id: { $in: missingIds.map((formId) => util.idToBson(formId)) },
                deleted: { $eq: null },
              },
              req,
            ),
          )
          .lean()
          .exec();

        if (!result || !result.length) {
          return cached;
        }

        result.forEach((form) => this.updateCache(req, cache, form));
        return cached.concat(result);
      } catch (err) {
        debug.loadForms(err);
        throw err;
      }
    },

    async loadFormRevisions(req, revs) {
      if (!revs || !revs.length || !router.formio.resources.formrevision) {
        debug.loadSubForms(`Form revisions not used.`);
        return;
      }

      const formRevs = {};
      try {
        await Promise.all(revs.map(async (rev) => {
          const formRevision = rev.revision || rev.formRevision;
          debug.loadSubForms(`Loading form ${util.idToBson(rev.form)} revision ${formRevision}`);
          const loadRevision =
            formRevision.length === 24
              ? router.formio.resources.formrevision.model.findOne({
                  revisionId: util.idToBson(rev.revision),
                })
              : router.formio.resources.formrevision.model.findOne(
                  await hook.alter(
                    'formQuery',
                    {
                      _rid: util.idToBson(rev.form),
                      _vid: parseInt(formRevision),
                      deleted: { $eq: null },
                    },
                    req,
                  ),
                );

          const result = await loadRevision.lean().exec();
          if (!result) {
            debug.loadSubForms(
              `Cannot find form revision for form ${rev.form} revision ${formRevision}`,
            );
            return;
          }

          debug.loadSubForms(`Loaded revision for form ${rev.form} revision ${formRevision}`);
          formRevs[rev.form.toString()] = result;
        }));
      }
      catch (err) {
        debug.loadSubForms(err);
        debug.loadFormRevisions(err);
        throw err;
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
      } else if (req.body.data && req.body.data.formId) {
        formId = req.body.data.formId;
      } else if (req.query.formId) {
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
     * @returns {*}
     */
    async loadCurrentForm(req) {
      const formId = this.getCurrentFormId(req);
      if (!formId) {
        throw new Error('No form found.');
      }
      return await this.loadForm(req, null, formId);
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
     */
    async loadSubmission(req, formId, subId, noCachedResult) {
      const cache = this.cache(req);
      if (!noCachedResult && cache.submissions[subId]) {
        debug.loadSubmission(`Cache hit: ${subId}`);
        return cache.submissions[subId];
      }

      subId = util.idToBson(subId);
      if (subId === false) {
        throw new Error('Invalid submission _id given.');
      }

      formId = util.idToBson(formId);
      if (formId === false) {
        throw new Error('Invalid form _id given.');
      }

      debug.loadSubmission(`Searching for form: ${formId}, and submission: ${subId}`);
      const query = { _id: subId, form: formId, deleted: { $eq: null } };
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;

      try {
        const submission = await submissionModel
          .findOne(hook.alter('submissionQuery', query, req))
          .lean()
          .exec();
        if (!submission) {
          debug.loadSubmission('No submission found for the given query.');
          return;
        }

        const finalResult = await hook.alter('loadSubmission', submission, req);
        cache.submissions[subId] = finalResult;
        return finalResult;
      } catch (err) {
        debug.loadSubmission(err);
        throw err;
      }
    },

    /**
     * Load an array of submissions.
     *
     * @param req
     * @param subs
     */
    async loadSubmissions(req, subs) {
      if (!subs || !subs.length) {
        // Shortcut if no subs are provided.
        return [];
      }

      const query = {
        _id: { $in: subs.map((subId) => util.idToBson(subId)) },
        deleted: { $eq: null },
      };
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      try {
        const submissions = await submissionModel
          .find(hook.alter('submissionQuery', query, req))
          .lean()
          .exec();
        if (!submissions) {
          return [];
        }
        return submissions;
      } catch (err) {
        debug.loadSubmissions(err);
        throw err;
      }
    },

    /**
     * Load a submission into the request.
     *
     * @param req
     */
    async loadCurrentSubmission(req) {
      if (!req.params.submissionId) {
        throw new Error('No submission found.');
      }
      if (!req.params.formId) {
        throw new Error('No form provided');
      }
      const submission = await this.loadSubmission(req, req.params.formId, req.params.submissionId);
      return submission;
    },

    /**
     * Load a resource by name.
     *
     * @param req {Object}
     *   The Express request object.
     * @param name {String}
     *   The resource name to search for.
     */
    async loadFormByName(req, name) {
      const cache = this.cache(req);
      if (cache.names[name]) {
        debug.loadFormByName(`Cache hit: ${name}`);
        return await this.loadForm(req, 'resource', cache.names[name]);
      } else {
        const query = await hook.alter(
          'formQuery',
          {
            name: name,
            deleted: { $eq: null },
          },
          req,
        );

        try {
          const result = await router.formio.resources.form.model.findOne(query).lean().exec();
          if (!result) {
            throw new Error('Resource not found');
          }

          try {
            const finalResult = await hook.alter('loadForm', result, req);
            this.updateCache(req, cache, finalResult);
            debug.loadForm('Caching result');
            return finalResult;
          } catch (err) {
            debug.loadForm(err);
            throw err;
          }
        } catch (err) {
          debug.loadFormByName(err);
          throw err;
        }
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
    async loadFormByAlias(req, alias) {
      const cache = this.cache(req);
      if (cache.aliases[alias]) {
        debug.loadFormByAlias(`Cache hit: ${alias}`);
        return await this.loadForm(req, 'resource', cache.aliases[alias]);
      } else {
        const query = await hook.alter(
          'formQuery',
          {
            path: alias,
            deleted: { $eq: null },
          },
          req,
        );

        try {
          const result = await router.formio.resources.form.model.findOne(query).lean().exec();
          if (!result) {
            throw new Error('Resource not found');
          }

          try {
            const finalResult = await hook.alter('loadForm', result, req);
            this.updateCache(req, cache, finalResult);
            debug.loadForm('Caching result');
            return finalResult;
          } catch (err) {
            debug.loadForm(err);
            throw err;
          }
        } catch (err) {
          debug.loadFormByAlias(err);
          throw err;
        }
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
    async loadAllForms(form, req, depth, forms) {
      depth = depth || 0;
      forms = forms || {};
      debug.loadSubForms(`Loading subforms for ${form._id}`);

      // Only allow 5 deep.
      if (depth >= 5) {
        return;
      }

      // Get all of the form components.
      const formIds = [];
      const formRevs = [];
      util.eachComponent(
        form.components,
        function (component) {
          if (component.type === 'form' && component.form) {
            const formId = component.form.toString();
            formIds.push(formId);
            debug.loadSubForms(`Found subform ${formId}`);
            // 'formRevision' was used in the older builder versions
            if (component.revision || component.formRevision) {
              formRevs.push(component);
            }
          }
        },
        true,
      );

      // Only proceed if we have form components.
      if (!formIds.length) {
        return;
      }

      // Load all subforms in this form.
      debug.loadSubForms(`Loading subforms ${formIds.join(', ')}`);
      try {
        const result = await this.loadForms(req, formIds);
        // Load all form revisions.
        let revs = await this.loadFormRevisions(req, formRevs);
        // Iterate through all subforms.
        revs = revs || {};
        return Promise.all(result.map(async (subForm) => {
          const formId = subForm._id.toString();
          if (forms[formId]) {
            debug.loadSubForms(`Subforms already loaded for ${formId}.`);
            return;
          }
          forms[formId] = revs[formId] ? revs[formId] : subForm;
          await this.loadAllForms(subForm, req, depth + 1, forms);
        }));
      } catch (ignoreErr) {
        return;
      }
    },

    setFormComponents(components, forms) {
      if (components.noRecurse) {
        return;
      }
      components.noRecurse = true;
      util.eachComponent(
        components,
        (component) => {
          if (component.type === 'form' && component.form) {
            const formId = component.form.toString();
            if (forms[formId]) {
              component.components = forms[formId].components;
              this.setFormComponents(component.components, forms);
            }
          }
        },
        true,
      );
    },

    async loadSubForms(form, req) {
      const forms = {};
      await this.loadAllForms(form, req, 0, forms);
      this.setFormComponents(form.components, forms);
      return form;
    },

    /**
     * Loads sub submissions from a nested subform hierarchy.
     *
     * @param form
     * @param submission
     * @param req
     * @param next
     * @param depth
     * @param {Object} options
     * @param {boolean} options.resolveNestedFormRevisions - When true, nested form components with
     *   useOriginalRevision will have their component schemas replaced with the form revision that
     *   the submission was originally created against.
     * @return {*}
     */
    async loadSubSubmissions(form, submission, req, depth, options = {}) {
      depth = depth || 0;

      // Only allow 5 deep.
      if (depth >= 5) {
        return;
      }

      // Get all the subform data.
      const subs = {};
      const getSubs = (components, outerPath, parent) => {
        util.eachComponent(
          components,
          function (component, path, components, parent, compPaths) {
            const dataPath = compPaths.dataPath || path;
            const subData = _.get(submission.data, dataPath);
            if (Array.isArray(subData)) {
              return subData.forEach((_, idx) => {
                getSubs(component.components, { dataPath: dataPath, dataIndex: idx }, component);
              });
            }
            if (component.type === 'form' || component.reference) {
              const subData = _.get(submission.data, dataPath);
              if (subData && subData._id) {
                const dataId = subData._id.toString();
                const subInfo = { component, path: dataPath, data: subData.data };
                if (subs[dataId] && _.isArray(subs[dataId])) {
                  subs[dataId].push(subInfo);
                } else {
                  subs[dataId] = [
                    subInfo,
                  ];
                }
              }
            }
          },
          true,
          outerPath,
          parent,
        );
      };

      getSubs(form.components);

      // Load all the submissions within this submission.
      try {
        const submissions = await this.loadSubmissions(req, Object.keys(subs));
        if (!submissions || !submissions.length) {
          return;
        }
        for (const sub of submissions) {
          if (!sub || !sub._id) {
            continue;
          }
          const subId = sub._id.toString();
          if (subs[subId]) {
            await Promise.all(subs[subId].map(async (subInfo) => {
              // Set the subform data if it contains more data... legacy renderers don't fare well with sub-data.
              if (
                !subInfo.data ||
                Object.keys(sub.data).length > Object.keys(subInfo.data).length
              ) {
                _.set(submission.data, subInfo.path, sub);
              }
              if (options.resolveNestedFormRevisions && subInfo.component.useOriginalRevision) {
                await this.resolveOriginalRevision(req, subInfo.component, sub);
              }
              // Load all subdata within this submission.
              await this.loadSubSubmissions(subInfo.component, sub, req, depth + 1, options);
            }));
          }
        }
      } catch (ignoreErr) {
        return;
      }
    },

    /**
     * Resolve the original form revision for a nested form submission.
     * Uses the submission's _frid/_fvid to find the revision the submission was created against,
     * then swaps the component's schema with the revision's.
     *
     * @param req
     * @param component - the nested form component (must have component.form set)
     * @param submission - the hydrated submission object (with _frid/_fvid)
     */
    async resolveOriginalRevision(req, component, submission) {
      // todo: if this function is used for other cases in the future, a PDF proxy flag could be added
      // Always delete so the PDF server doesn't try to re-fetch when rendering the form
      delete component.useOriginalRevision;

      // Check if the base form has revisions enabled
      let baseForm;
      try {
        baseForm = await this.loadForm(req, null, component.form);
      }
      catch (err) {
        return;
      }
      if (!baseForm || !baseForm.revisions) return;

      const formRevisionId = submission._frid || submission._fvid;
      // no need to load the original revision if the form component is already using it
      if (_.isNil(formRevisionId) || formRevisionId === baseForm._vid) return;

      try {
        // todo: possible enhancement–– add form revisions to the cache
        const revision = await this.loadFormRevision(component.form, formRevisionId);
        if (!revision) return;
        component.components = revision.components;
        component.settings = revision.settings;
        // Re-hydrate subforms that may exist in the restored revision but not in the current version
        await this.loadSubForms(component, req);
      }
      catch (err) {
        debug.loadFormRevisions(`Error resolving original revision for form ${component.form}: ${err}`);
      }
    },

    /**
     * Find a form revision by its revision ID. Returns the revision document (lean) or null.
     *
     * @param {string} formId - The form's _id to match against form revision _rid
     * @param {string|number} revisionId - Either a 24-char ObjectId (_frid) or an integer version (_fvid) from the submission
     * @returns {Promise<Object|null>}
     */
    async loadFormRevision(formId, revisionId) {
      if (_.isNil(revisionId)) return null;

      const revId = String(revisionId);
      const query = {
        _rid: util.idToBson(formId),
      };

      if (ObjectId.isValid(revId)) {
        query._id = util.idToBson(revId);
      }
      else {
        const vid = parseInt(revId, 10);
        if (Number.isNaN(vid)) return null;
        query._vid = vid;
      }

      return router.formio.resources.formrevision.model.findOne(query).lean().exec();
    },
  };
};
