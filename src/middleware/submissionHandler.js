'use strict';

const _ = require('lodash');
const util = require('../util/util');
const metrics = require('../util/metrics');
const Validator = require('../resources/Validator');
const setDefaultProperties = require('../actions/properties/setDefaultProperties');

module.exports = (router) => {
  const hook = require('../util/hook')(router.formio);
  const fActions = require('../actions/fields')(router);
  const pActions = require('../actions/properties')(router);
  const handlers = {};

  // The only attribute every reported measurement carries. Deliberately nothing derived from the
  // form or the project: those would mint a time series per form.
  const metricAttributes = (req) => ({ 'http.request.method': req.method });

  // Iterate through the possible handlers.
  [
    {
      name: 'read',
      method: 'Get',
    },
    {
      name: 'update',
      method: 'Put',
    },
    {
      name: 'update',
      method: 'Patch',
    },
    {
      name: 'create',
      method: 'Post',
    },
    {
      name: 'delete',
      method: 'Delete',
    },
    {
      name: 'index',
      method: 'Index',
    },
  ].forEach((method) => {
    /**
     * Load the current form into the request.
     *
     * @param req
     */
    async function loadCurrentForm(req) {
      const form = await router.formio.cache.loadCurrentForm(req);
      if (!form) {
        throw new Error('Form not found.');
      }
      req.currentForm = hook.alter('currentForm', form, req.body);
      // A tree walk, in the same order as the ones `loadSubForms` and `executeFieldHandlers`
      // already do per request — which is why it goes through `hook.report`: unregistered, the
      // walk never runs.
      hook.report('observe', () => {
        const componentCount = Object.keys(
          util.flattenComponents(req.currentForm.components, true),
        ).length;
        return [metrics.FORM_COMPONENTS, componentCount, metricAttributes(req)];
      });
      await router.formio.cache.loadSubForms(req.currentForm, req);
    }

    /**
     * Initialize the submission object which includes filtering.
     *
     * @param req
     */
    async function initializeSubmission(req) {
      const ensureDataOnPost = (req) => {
        if (!req.body.data) {
          req.body.data = {};
        }
      };

      const ensureFvidIsNumber = (req) => {
        if (req.body.hasOwnProperty('_fvid') && !_.isNaN(parseInt(req.body._fvid))) {
          if (req.body._fvid.length === 24) {
            req.body._frid = req.body._fvid;
            delete req.body._fvid;
          } else {
            req.body._fvid = parseInt(req.body._fvid);
          }
        }
      };

      const updateRoles = (req, current) => {
        if (req.rolesUpdate && req.rolesUpdate.length && current.roles && current.roles.length) {
          const newRoles = _.intersection(
            current.roles.map((role) => role.toString()),
            req.rolesUpdate,
          );
          req.body.roles = newRoles.map((roleId) => util.idToBson(roleId));
        }
      };

      const setSubmissionId = (req) => {
        if (req.params.submissionId) {
          req.body._id = req.params.submissionId;
          req.subId = req.params.submissionId;
        }
      };

      const setRequestHeaders = (req) => {
        const captureIpAddress =
          process.env.CAPTURE_IP_ADDRESS &&
          (process.env.CAPTURE_IP_ADDRESS.toLowerCase() === 'true' ||
            process.env.CAPTURE_IP_ADDRESS === '1');

        const allowlist = [
          'host',
          'x-forwarded-scheme',
          'x-forwarded-proto',
          'connection',
          'content-length',
          'pragma',
          'cache-control',
          'sec-ch-ua',
          'accept',
          'content-type',
          'sec-ch-ua-mobile',
          'user-agent',
          'sec-ch-ua-platform',
          'origin',
          'sec-fetch-site',
          'sec-fetch-mode',
          'sec-fetch-dest',
          'referer',
          'accept-encoding',
          'accept-language',
          'sec-gpc',
          'dnt',
        ];

        if (captureIpAddress) {
          allowlist.push('x-forwarded-for', 'x-real-ip');
        }

        const reqHeaders = _.omitBy(req.headers, (value, key) => {
          return !allowlist.includes(key) || key.match(/auth/gi);
        });

        _.set(req.body, 'metadata.headers', reqHeaders);
      };

      const handlePostAndPutRequests = async (req) => {
        req.skipResource = true;
        const properties = hook.alter('submissionParams', [
          'data',
          'owner',
          'access',
          'metadata',
          '_vnote',
        ]);
        req.rolesUpdate = req.body.roles;
        req.body = _.pick(req.body, properties);

        if (req.method === 'POST') {
          ensureDataOnPost(req);
          setRequestHeaders(req);
        }

        ensureFvidIsNumber(req);
        setSubmissionId(req);

        req.body.form = req.currentForm._id.toString();
        req.body = hook.alter('submissionRequest', req.body);

        if (req.method === 'PUT' && req.params.submissionId) {
          const current = await router.formio.cache.loadCurrentSubmission(req);
          updateRoles(req, current);
          req.currentSubmissionData = current && current.data;
        }
      };

      const handleGetRequest = (req) => {
        const submissionQuery = hook.alter('submissionQuery', { form: req.currentForm._id }, req);
        req.countQuery = req.countQuery || req.model || this.model;
        req.modelQuery = req.modelQuery || req.model || this.model;
        req.countQuery = req.countQuery.find(submissionQuery);
        req.modelQuery = req.modelQuery.find(submissionQuery);
      };

      const isGet = req.method === 'GET';

      if (isGet) {
        handleGetRequest(req);
      } else if (req.body) {
        await handlePostAndPutRequests(req);
      }
    }

    /**
     * Initialize the actions.
     *
     * @param req
     * @param res
     */
    async function initializeActions(req, res) {
      // If they wish to disable actions, then just skip.
      if (req.query.dryrun) {
        return;
      }
      await new Promise((resolve, reject) => {
        router.formio.actions.initialize(method.name, req, res, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }

    /**
     * Validate a submission.
     *
     * @param req
     * @param form
     */
    async function validateSubmission(req, res) {
      req.noValidate = req.noValidate || (req.isAdmin && req.query.noValidate);

      // No need to validate on GET requests.
      if (!(['POST', 'PUT', 'PATCH'].includes(req.method) && req.body)) {
        return;
      }

      // Assign submission data to the request body.
      const formId = _.get(req, 'body.data.form');
      if (!req.mainForm) {
        const hasSubforms = Object.values(_.get(req, 'body.data', {})).some(
          (value) => _.isObject(value) && value.form,
        );
        req.mainForm = hasSubforms && _.get(req, 'body.form');
      }
      let isSubform = formId && formId.toString() !== req.currentForm._id.toString();
      isSubform =
        !isSubform && req.mainForm
          ? req.mainForm.toString() !== req.currentForm._id.toString()
          : isSubform;
      req.submission = req.submission || { data: {} };
      if (!_.isEmpty(req.submission.data) && !isSubform && !req.isTransformedData) {
        req.body.data = _.assign(req.body.data, req.submission.data);
      }

      // Clone the submission to the real value of the request body.
      req.submission = _.cloneDeep(req.body);

      // Next we need to validate the input.
      await new Promise((resolve, reject) => {
        hook.alter('validateSubmissionForm', req.currentForm, req.body, req, async () => {
          // Validate the request.
          const validator = new Validator(req, router);
          await validator.validate(req.body, (err, data) => {
            if (req.noValidate) {
              return resolve();
            }
            if (err) {
              res.status(400).json(err);
              return reject(err);
            }
            data = hook.alter('rehydrateValidatedSubmissionData', data, req);

            res.submission = { data: data };
            resolve();
          });
        });
      });
    }
    /**
     * Execute the actions.
     *
     * @param req
     * @param res
     */
    async function executeActions(handler, req, res) {
      // If they wish to disable actions, then just skip.
      if (req.query.dryrun) {
        return;
      }
      // If the body is undefined, then omit the body.
      if (
        handler === 'before' &&
        req.body &&
        req.body.hasOwnProperty('data') &&
        typeof req.body.data === 'undefined'
      ) {
        req.body = _.omit(req.body, 'data');
      }

      await new Promise((resolve, reject) => {
        router.formio.actions.execute(handler, method.name, req, res, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }
    /**
     * Execute the field handlers.
     *
     * @param {boolean} validation
     *   Whether or not validation is require before running the field actions.
     * @param req
     * @param res
     */
    async function executeFieldHandlers(validation, req, res) {
      const promises = [];
      const resourceData = _.get(res, 'resource.item.data', {});
      const submissionData = req.body.data || resourceData;

      util.eachValue(
        req.currentForm.components,
        submissionData,
        ({ component, data, handler, action, path, fullPath, parentHidden }) => {
          if (component) {
            const componentPath = util.valuePath(path, component.key);
            const componentFullPath = util.valuePath(fullPath, component.key);

            // Remove not persistent data
            if (
              data &&
              component.hasOwnProperty('persistent') &&
              (!component.persistent || component.persistent === 'client-only') &&
              !['columns', 'fieldset', 'panel', 'table', 'tabs'].includes(component.type)
            ) {
              util.deleteProp(component.key)(data);
            }

            const fieldActions = hook.alter('fieldActions', fActions);
            const propertyActions = hook.alter('propertyActions', pActions);

            // Execute the property handlers after validation has occurred.
            const handlerArgs = [
              component,
              data,
              handler,
              action,
              {
                validation,
                path: componentPath,
                fullPath: componentFullPath,
                parentHidden,
                req,
                res,
              },
            ];
            // Execute the field handler.
            if (fieldActions.hasOwnProperty(component.type)) {
              promises.push(fieldActions[component.type](...handlerArgs));
            }
            if (validation) {
              Object.keys(propertyActions).forEach((property) => {
                // Set the default value of property if only minified schema of component is loaded
                if (
                  !component.hasOwnProperty(property) &&
                  setDefaultProperties.hasOwnProperty(property)
                ) {
                  setDefaultProperties[property](component);
                }
                if (component.hasOwnProperty(property) && component[property]) {
                  promises.push(propertyActions[property](...handlerArgs));
                }
              });
            }
          }
        },
        {
          validation,
          handler: req.handlerName,
          action: req.method.toLowerCase(),
          req,
          res,
        },
      );

      hook.report('observe', () => [
        metrics.SUBMISSION_FIELD_HANDLERS,
        promises.length,
        { ...metricAttributes(req), validated: validation },
      ]);

      await Promise.all(promises);
    }
    /**
     * Ensure that a response is always sent.
     *
     * @param req
     * @param res
     */
    async function ensureResponse(req, res) {
      if (!res.resource && !res.headersSent) {
        res.status(200).json(res.submission || true);
      }
    }

    async function alterSubmission(req, res) {
      await new Promise((resolve) => {
        hook.alter('submission', req, res, async () => {
          if (req.handlerName === 'afterPost' || req.handlerName === 'afterPut') {
            // Perform a post submission update.
            if (res.resource && res.resource.item && res.resource.item._id) {
              const submissionUpdate = {};
              if (!res.resource.item.owner && res.resource.item.roles.length) {
                res.resource.item.owner = res.resource.item._id;
                submissionUpdate.owner = res.resource.item._id;
              }
              hook.alter('postSubmissionUpdate', req, res, submissionUpdate);
              // If an update exists.
              if (Object.keys(submissionUpdate).length) {
                const submissionModel =
                  req.submissionModel || router.formio.resources.submission.model;
                await submissionModel.updateOne(
                  {
                    _id: res.resource.item._id,
                  },
                  { $set: submissionUpdate },
                );
                resolve();
              } else {
                resolve();
              }
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      });
    }
    // Every lifecycle stage is offered to `hook.instrument`, which hands back the stage unchanged
    // unless a consumer registered an implementation. Offered per request rather than once here:
    // `router.formio.middleware` is built at index.js:34, before `router.init(hooks)` assigns
    // `router.formio.hooks`, so at this point nothing can be registered yet. GOTCHA(G-FOS07)

    // Add before handlers.
    const before = `before${method.method}`;
    handlers[before] = async (req, res, next) => {
      req.handlerName = before;
      try {
        await hook.instrument('loadCurrentForm', loadCurrentForm)(req);
        await hook.instrument('initializeSubmission', initializeSubmission)(req);
        await hook.instrument('initializeActions', initializeActions)(req, res);
        await hook.instrument('executeFieldHandlers', executeFieldHandlers)(false, req, res);
        await hook.instrument('validateSubmission', validateSubmission)(req, res);
        await hook.instrument('executeFieldHandlers', executeFieldHandlers)(true, req, res);
        await alterSubmission(req, res);
        await hook.instrument('executeActions', executeActions)('before', req, res);
        return next();
      } catch (error) {
        if (!res.headersSent) {
          return next(error);
        }
      }
    };
    // Add after handlers.
    const after = `after${method.method}`;
    handlers[after] = async (req, res, next) => {
      req.handlerName = after;
      try {
        await hook.instrument('executeFieldHandlers', executeFieldHandlers)(true, req, res);
        await hook.instrument('executeActions', executeActions)('after', req, res);
        await alterSubmission(req, res);
        await ensureResponse(req, res);
        return next();
      } catch (error) {
        return next(error);
      } finally {
        // resourcejs has written the document before it calls this handler, so the count means
        // persisted, not attempted. It is taken in a `finally` because a blocking after-action that
        // throws — a webhook answering 500 — must not take the count of an already-saved submission
        // with it.
        const submissionWasCreated = method.name === 'create' && !!_.get(res, 'resource.item._id');
        if (submissionWasCreated) {
          hook.report('count', () => [metrics.SUBMISSION_CREATED, 1, metricAttributes(req)]);
        }
      }
    };
  });

  // Return the handlers.
  return handlers;
};
