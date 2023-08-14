'use strict';

const _ = require('lodash');
const async = require('async');
const util = require('../util/util');
const Validator = require('../resources/Validator');
const setDefaultProperties = require('../actions/properties/setDefaultProperties');

module.exports = (router, resourceName, resourceId) => {
  const hook = require('../util/hook')(router.formio);
  const fActions = require('../actions/fields')(router);
  const pActions = require('../actions/properties')(router);
  const handlers = {};

  // Iterate through the possible handlers.
  [
    {
      name: 'read',
      method: 'Get'
    },
    {
      name: 'update',
      method: 'Put'
    },
    {
      name: 'update',
      method: 'Patch'
    },
    {
      name: 'create',
      method: 'Post'
    },
    {
      name: 'delete',
      method: 'Delete'
    },
    {
      name: 'index',
      method: 'Index'
    }
  ].forEach((method) => {
    /**
     * Load the current form into the request.
     *
     * @param req
     * @param done
     */
    function loadCurrentForm(req, done) {
      router.formio.cache.loadCurrentForm(req, (err, form) => {
        if (err) {
          return done(err);
        }
        if (!form) {
          return done('Form not found.');
        }

          req.currentForm = hook.alter('currentForm', form, req.body);

        // Load all subforms as well.
        router.formio.cache.loadSubForms(req.currentForm, req, () => {
          req.flattenedComponents = util.flattenComponents(form.components, true);
          return done();
        });
      }, true);
    }

    /**
     * Initialize the submission object which includes filtering.
     *
     * @param req
     * @param done
     */
    function initializeSubmission(req, done) {
      const isGet = (req.method === 'GET');

      // If this is a get method, then filter the model query.
      if (isGet) {
        const submissionQuery = hook.alter('submissionQuery', {form: req.currentForm._id}, req);
        req.countQuery = req.countQuery || req.model || this.model;
        req.modelQuery = req.modelQuery || req.model || this.model;
        req.countQuery = req.countQuery.find(submissionQuery);
        req.modelQuery = req.modelQuery.find(submissionQuery);
      }

      // If the request has a body.
      if (!isGet && req.body) {
        // By default skip the resource unless they add the save submission action.
        req.skipResource = true;

        // Only allow the data to go through.
        const properties = hook.alter('submissionParams', ['data', 'owner', 'access', 'metadata', '_vnote']);
        req.rolesUpdate = req.body.roles;
        req.body = _.pick(req.body, properties);

        // Ensure there is always data provided on POST.
        if (req.method === 'POST' && !req.body.data) {
          req.body.data = {};
        }

        if (req.method === 'POST') {
          const allowlist = [
            "host",
            "x-forwarded-scheme",
            "x-forwarded-proto",
            "x-forwarded-for",
            "x-real-ip",
            "connection",
            "content-length",
            "pragma",
            "cache-control",
            "sec-ch-ua",
            "accept",
            "content-type",
            "sec-ch-ua-mobile",
            "user-agent",
            "sec-ch-ua-platform",
            "origin",
            "sec-fetch-site",
            "sec-fetch-mode",
            "sec-fetch-dest",
            "referer",
            "accept-encoding",
            "accept-language",
            "sec-gpc",
            "dnt",
          ];

          const reqHeaders = _.omitBy(req.headers, (value, key) => {
            return !allowlist.includes(key) || key.match(/auth/gi);
          });

          _.set(req.body, 'metadata.headers', reqHeaders);
        }

        // Ensure that the _fvid is a number.
        if (req.body.hasOwnProperty('_fvid') && !_.isNaN(parseInt(req.body._fvid))) {
          if (req.body._fvid.length === 24) {
            req.body._frid = req.body._fvid;
            delete req.body._fvid;
          }
          else {
            req.body._fvid = parseInt(req.body._fvid);
          }
        }

        // Ensure they cannot reset the submission id.
        if (req.params.submissionId) {
          req.body._id = req.params.submissionId;
          req.subId = req.params.submissionId;
        }

        // Set the form to the current form.
        req.body.form = req.currentForm._id.toString();

        // Allow them to alter the body.
        req.body = hook.alter('submissionRequest', req.body);

        if (req.method === 'PUT' && req.params.submissionId) {
          router.formio.cache.loadCurrentSubmission(req, (err, current) => {
            if ( req.rolesUpdate && req.rolesUpdate.length && current.roles && current.roles.length) {
              const newRoles = _.intersection(
                current.roles.map((role) => role.toString()),
                req.rolesUpdate
              );
                req.body.roles = newRoles.map((roleId) => util.idToBson(roleId));
            }

            req.currentSubmissionData = current && current.data;
            done();
          });
        }
        else {
          done();
        }
      }
      else {
        done();
      }
    }

    /**
     * Initialize the actions.
     *
     * @param req
     * @param res
     * @param done
     */
    function initializeActions(req, res, done) {
      // If they wish to disable actions, then just skip.
      if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
        return done();
      }

      router.formio.actions.initialize(method.name, req, res, done);
    }

    /**
     * Validate a submission.
     *
     * @param req
     * @param form
     * @param done
     */
    function validateSubmission(req, res, done) {
      req.noValidate = req.noValidate || (req.isAdmin && req.query.noValidate);

      // No need to validate on GET requests.
      if (!(['POST', 'PUT', 'PATCH'].includes(req.method) && req.body)) {
        return done();
      }

      // Assign submission data to the request body.
      const formId = _.get(req, 'body.data.form');
      if (!req.mainForm) {
        const hasSubforms = Object.values(_.get(req, 'body.data', {})).some(value => _.isObject(value) && value.form);
        req.mainForm = hasSubforms && _.get(req, 'body.form');
      }
      let isSubform = formId && formId.toString() !== req.currentForm._id.toString();
      isSubform = !isSubform && req.mainForm ? req.mainForm.toString() !== req.currentForm._id.toString() : isSubform;
      req.submission = req.submission || {data: {}};
      if (!_.isEmpty(req.submission.data) && !isSubform) {
        req.body.data = _.assign(req.body.data, req.submission.data);
      }

      // Clone the submission to the real value of the request body.
      req.submission = _.cloneDeep(req.body);

      // Next we need to validate the input.
      hook.alter('validateSubmissionForm', req.currentForm, req.body, async form => { // eslint-disable-line max-statements
        // Get the submission model.
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;

        // Next we need to validate the input.
        const token = util.getRequestValue(req, 'x-jwt-token');
        const validator = new Validator(req.currentForm, submissionModel, token, req.token, hook);
        validator.validateReCaptcha = (responseToken) => {
          return new Promise((resolve, reject) => {
            router.formio.mongoose.models.token.findOne({value: responseToken}, (err, token) => {
              if (err) {
                return reject(err);
              }

              if (!token) {
                return reject(new Error('ReCaptcha: Response token not found'));
              }

              // Remove temp token after submission with reCaptcha
              return token.remove(() => resolve(true));
            });
          });
        };

        // Validate the request.
        validator.validate(req.body, (err, data, visibleComponents) => {
          if (req.noValidate) {
            return done();
          }
          if (err) {
            return res.status(400).json(err);
          }

          res.submission = {data: data};

          if (!_.isEqual(visibleComponents, req.currentForm.components)) {
            req.currentFormComponents = visibleComponents;
          }
          else if (req.hasOwnProperty('currentFormComponents') && req.currentFormComponents) {
            delete req.currentFormComponents;
          }
          done();
        });
      });
    }

    /**
     * Execute the actions.
     *
     * @param req
     * @param res
     * @param done
     */
    function executeActions(handler) {
      return (req, res, done) => {
        // If they wish to disable actions, then just skip.
        if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
          return done();
        }

        // If the body is undefined, then omit the body.
        if (
          (handler === 'before') &&
          (req.body && req.body.hasOwnProperty('data') && typeof req.body.data === 'undefined')
        ) {
          req.body = _.omit(req.body, 'data');
        }

        router.formio.actions.execute(handler, method.name, req, res, done);
      };
    }

    /**
     * Execute the field handlers.
     *
     * @param {boolean} validation
     *   Whether or not validation is require before running the field actions.
     * @param req
     * @param res
     * @param done
     */
    function executeFieldHandlers(validation, req, res, done) {
      const promises = [];
      const resourceData = _.get(res, 'resource.item.data', {});
      const submissionData = req.body.data || resourceData;

      util.eachValue((req.currentFormComponents || req.currentForm.components), submissionData, ({
        component,
        data,
        handler,
        action,
        path,
      }) => {
        if (component) {
          const componentPath = util.valuePath(path, component.key);

          // Remove not persistent data
          if (
            data &&
            component.hasOwnProperty('persistent') &&
            !component.persistent &&
            !['columns', 'fieldset', 'panel', 'table', 'tabs'].includes(component.type)
          ) {
            util.deleteProp(component.key)(data);
          }
          else if (req.method === 'PUT') {
            // Restore value of components with calculated value and disabled server calculation
            // if they don't present in submission data
            const newCompData = _.get(submissionData, componentPath, undefined);
            const currentCompData = _.get(req.currentSubmissionData, componentPath);

            if (component.calculateValue &&
                !component.calculateServer &&
                currentCompData &&
                newCompData === undefined) {
              _.set(submissionData, componentPath, _.get(req.currentSubmissionData, componentPath));
            }
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
              req,
              res,
            },
          ];

          if (validation) {
            Object.keys(propertyActions).forEach((property) => {
              // Set the default value of property if only minified schema of component is loaded
              if (!component.hasOwnProperty(property) && setDefaultProperties.hasOwnProperty(property)) {
              setDefaultProperties[property](component);
              }
              if (component.hasOwnProperty(property) && component[property]) {
                promises.push(propertyActions[property](...handlerArgs));
              }
            });
          }

          // Execute the field handler.
          if (fieldActions.hasOwnProperty(component.type)) {
            promises.push(fieldActions[component.type](...handlerArgs));
          }
        }
      }, {
        validation,
        handler: req.handlerName,
        action: req.method.toLowerCase(),
        req,
        res,
      });

      Promise.all(promises)
        .then(() => done())
        .catch(done);
    }

    /**
     * Ensure that a response is always sent.
     *
     * @param req
     * @param res
     * @param done
     */
    function ensureResponse(req, res, done) {
      if (!res.resource && !res.headersSent) {
        res.status(200).json(res.submission || true);
      }
      done();
    }

    function alterSubmission(req, res, done) {
      hook.alter('submission', req, res, () => {
        if (
          (req.handlerName === 'afterPost') ||
          (req.handlerName === 'afterPut')
        ) {
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
              const submissionModel = req.submissionModel || router.formio.resources.submission.model;
              submissionModel.updateOne({
                _id: res.resource.item._id
              }, {'$set': submissionUpdate}, done);
            }
            else {
              done();
            }
          }
          else {
            done();
          }
        }
        else {
          done();
        }
      });
    }

    // Add before handlers.
    const before = `before${method.method}`;
    handlers[before] = (req, res, next) => {
      req.handlerName = before;
      async.series([
        async.apply(loadCurrentForm, req),
        async.apply(initializeSubmission, req),
        async.apply(initializeActions, req, res),
        async.apply(executeFieldHandlers, false, req, res),
        async.apply(validateSubmission, req, res),
        async.apply(executeFieldHandlers, true, req, res),
        async.apply(alterSubmission, req, res),
        async.apply(executeActions('before'), req, res)
      ], next);
    };

    // Add after handlers.
    const after = `after${method.method}`;
    handlers[after] = (req, res, next) => {
      req.handlerName = after;
      async.series([
        async.apply(executeActions('after'), req, res),
        async.apply(executeFieldHandlers, true, req, res),
        async.apply(alterSubmission, req, res),
        async.apply(ensureResponse, req, res)
      ], (...args) => {
        delete req.currentFormComponents;
        next(...args);
      });
    };
  });

  // Return the handlers.
  return handlers;
};
