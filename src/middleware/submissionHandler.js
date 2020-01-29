'use strict';

const _ = require('lodash');
const async = require('async');
const util = require('../util/util');
const LegacyValidator = require('../resources/LegacyValidator');
const Validator = require('../resources/Validator');

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
        req.countQuery = req.countQuery || req.model || this.model;
        req.modelQuery = req.modelQuery || req.model || this.model;
        if (req.handlerName !== 'beforeGet') {
          // Set the model query to filter based on the ID.
          req.countQuery = req.countQuery.find({form: req.currentForm._id});
          req.modelQuery = req.modelQuery.find({form: req.currentForm._id});
        }
      }

      // If the request has a body.
      if (!isGet && req.body) {
        // By default skip the resource unless they add the save submission action.
        req.skipResource = true;

        // Only allow the data to go through.
        const properties = hook.alter('submissionParams', ['data', 'owner', 'access', 'metadata']);
        req.rolesUpdate = req.body.roles;
        req.body = _.pick(req.body, properties);

        // Ensure there is always data provided on POST.
        if (req.method === 'POST' && !req.body.data) {
          req.body.data = {};
        }

        // Ensure they cannot reset the submission id.
        if (req.params.submissionId) {
          req.body._id = req.params.submissionId;
        }

        // Set the form to the current form.
        req.body.form = req.currentForm._id.toString();

        // Allow them to alter the body.
        req.body = hook.alter('submissionRequest', req.body);

        // See if they provided an update to the roles.
        if (req.method === 'PUT' && req.params.submissionId && req.rolesUpdate && req.rolesUpdate.length) {
          router.formio.cache.loadCurrentSubmission(req, (err, current) => {
            if (current.roles && current.roles.length) {
              const newRoles = _.intersection(
                current.roles.map((role) => role.toString()),
                req.rolesUpdate
              );
              if (newRoles.length !== req.rolesUpdate.length) {
                req.body.roles = newRoles.map((roleId) => util.idToBson(roleId));
              }
            }
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
      // No need to validate on GET requests.
      if (!(['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && !req.noValidate)) {
        return done();
      }

      // Assign submission data to the request body.
      const formId = _.get(req, 'body.data.form');
      const isSubform = formId && formId.toString() !== req.currentForm._id.toString();
      req.submission = req.submission || {data: {}};
      if (!_.isEmpty(req.submission.data) && !isSubform) {
        req.body.data = _.assign(req.body.data, req.submission.data);
      }

      // Clone the submission to the real value of the request body.
      req.submission = _.cloneDeep(req.body);

      // Next we need to validate the input.
      hook.alter('validateSubmissionForm', req.currentForm, req.body, async form => { // eslint-disable-line max-statements
        // Allow use of the legacy validator
        const useLegacyValidator = (
          process.env.LEGACY_VALIDATOR ||
          req.headers['legacy-validator'] ||
          req.query.legacy_validator
        );

        // Get the submission model.
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;

        // Next we need to validate the input.
        const token = util.getRequestValue(req, 'x-jwt-token');
        const _Validator = useLegacyValidator ? LegacyValidator : Validator;
        const validator = new _Validator(req.currentForm, submissionModel, token);

        // Validate the request.
        validator.validate(req.body, (err, data) => {
          if (err) {
            return res.status(400).json(err);
          }

          res.submission = {data: data};
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

    // This should probably be moved to utils.
    function eachValue(components, data, fn, context, path = '') {
      const promises = [];

      components.forEach((component) => {
        if (component.hasOwnProperty('components') && Array.isArray(component.components)) {
          // If tree type is an array of objects like datagrid and editgrid.
          if (['datagrid', 'editgrid'].includes(component.type) || component.arrayTree) {
            _.get(data, component.key, []).forEach((row, index) => {
              promises.push(eachValue(
                component.components,
                row,
                fn,
                context,
                `${path ? `${path}.` : ''}${component.key}[${index}]`,
              ));
            });
          }
          else if (['form'].includes(component.type)) {
            promises.push(eachValue(
              component.components,
              _.get(data, `${component.key}.data`, {}),
              fn,
              context,
              `${path ? `${path}.` : ''}${component.key}.data`,
            ));
          }
          else if (
            ['container'].includes(component.type) ||
            (
              component.tree &&
              !['panel', 'table', 'well', 'columns', 'fieldset', 'tabs', 'form'].includes(component.type)
            )
          ) {
            promises.push(eachValue(
              component.components,
              _.get(data, component.key),
              fn,
              context,
              `${path ? `${path}.` : ''}${component.key}`,
            ));
          }
          else {
            promises.push(eachValue(component.components, data, fn, context, path));
          }
        }
        else if (component.hasOwnProperty('columns') && Array.isArray(component.columns)) {
          // Handle column like layout components.
          component.columns.forEach((column) => {
            promises.push(eachValue(column.components, data, fn, context, path));
          });
        }
        else if (component.hasOwnProperty('rows') && Array.isArray(component.rows)) {
          // Handle table like layout components.
          component.rows.forEach((row) => {
            if (Array.isArray(row)) {
              row.forEach((column) => {
                promises.push(eachValue(column.components, data, fn, context, path));
              });
            }
          });
        }
          // Call the callback for each component.
          promises.push(fn({...context, data, component, path}));
      });

      return Promise.all(promises);
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
      // If they wish to disable actions, then just skip.
      if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
        return done();
      }

      const promises = [];

      eachValue(req.currentForm.components, req.body.data, (context) => {
        const {component, data, handler, action, path} = context;

        // Remove not persistent data
        if (data &&
          component.hasOwnProperty('persistent') &&
          !component.persistent
        ) {
          util.deleteProp(component.key)(data);
        }

        const fieldActions = hook.alter('fieldActions', fActions);
        const propertyActions = hook.alter('propertyActions', pActions);
        const componentPath = `${path}${path ? '.' : ''}${component.key}`;

        // Execute the property handlers after validation has occurred.
        if (validation) {
          Object.keys(propertyActions).forEach((property) => {
            if (component.hasOwnProperty(property) && component[property]) {
              promises.push(propertyActions[property](component, data, handler, action, {
                validation,
                path: componentPath,
                req,
                res,
              }));
            }
          });
        }

        // Execute the field handler.
        if (fieldActions.hasOwnProperty(component.type)) {
          promises.push(fieldActions[component.type](component, data, handler, action, {
            validation,
            path: componentPath,
            req,
            res,
          }));
        }
      }, {validation, handler: req.handlerName, action: req.method.toLowerCase(), req, res});

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
              submissionModel.update({
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
      ], next);
    };
  });

  // Return the handlers.
  return handlers;
};
