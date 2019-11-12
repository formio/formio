'use strict';

const _ = require('lodash');
const async = require('async');
const util = require('../util/util');
const Validator = require('formiojs/components/Validator').ValidationChecker;

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
     * Execute the field handler.
     *
     * @param component
     *   The form component.
     * @param path
     *   The path to the data in the request body.
     * @param validation
     *   Whether or not validation is required before executing.
     * @param handlerName
     * @param req
     * @param res
     * @param done
     */
    function executeFieldHandler(component, path, validation, handlerName, req, res, done) {
      const fieldActions = hook.alter('fieldActions', fActions);
      const propertyActions = hook.alter('propertyActions', pActions);

      const handlers = [];
      const properties = ['reference'];

      // Execute the property handlers after validation has occurred.
      if (validation) {
        properties.map(property => {
          if (component.hasOwnProperty(property) && component[property]) {
            if (
              propertyActions.hasOwnProperty(property) &&
              propertyActions[property].hasOwnProperty(handlerName)
            ) {
              handlers.push(propertyActions[property][handlerName](component, path, req, res));
            }
          }
        });
      }

      // Execute the field handler.
      if (
        fieldActions.hasOwnProperty(component.type) &&
        fieldActions[component.type].hasOwnProperty(handlerName)
      ) {
        handlers.push(new Promise((resolve, reject) => {
          fieldActions[component.type][handlerName](component, path, validation, req, res, (err) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        }));
      }

      Promise.all(handlers)
        .then(() => done())
        .catch(done);
    }

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

        if (useLegacyValidator) {
          const LegacyValidator = require('../resources/LegacyValidator');

          // Get the submission model.
          const submissionModel = req.submissionModel || router.formio.resources.submission.model;

          // Next we need to validate the input.
          const token = util.getRequestValue(req, 'x-jwt-token');
          const validator = new LegacyValidator(req.currentForm, submissionModel, token);

          // Validate the request.
          validator.validate(req.body, (err, submission) => {
            if (err) {
              return res.status(400).json(err);
            }

            res.submission = {data: submission};

            done();
          });
        }
        else {
          // Define a few global noop placeholder shims and import the component classes
          global.Text              = class {};
          global.HTMLElement       = class {};
          global.HTMLCanvasElement = class {};
          global.navigator         = {userAgent: ''};
          global.document          = {createElement: () => ({}), cookie: '', getElementsByTagName: () => []};
          global.window            = {addEventListener: () => {}, Event: {}, navigator: global.navigator};

          const ComponentClasses = require('formiojs/components').default;

          // Assign .parent to each component for quickly traversing up the hierarchy
          const assignParentsRecursive = (children, parent) => {
            _.each(children, child => {
              child.component.parent = parent ? parent.component : null;
              assignParentsRecursive(child.children || [], child);
            });
          };

          assignParentsRecursive(util.buildHierarchy(req.currentForm.components));

          // Build flat lookup of components (including layout components)
          const componentSchemas = util.flattenComponents(req.currentForm.components, true);
          const components = {};

          _.each(componentSchemas, (schema, key) => {
            components[key] = components[schema.key] = {schema};
          });

          // Define helper function to recursively test conditional visibility up the chain
          const conditionallyVisibleRecursive = component => {
            // Instantiate the component if it hasn't been already
            if (!component.instance && ComponentClasses[component.schema.type]) {
              component.instance = new ComponentClasses[component.schema.type](
                _.cloneDeep(component.schema), {}, req.submission.data
              );

              component.instance.fieldLogic();
            }

            // Exit if we hit a hidden component
            if (component.instance && !component.instance.conditionallyVisible()) {
              return false;
            }

            // Walk up the chain recursively
            if (component.schema.parent) {
              let parent = component.schema.parent;

              while (parent && !parent.key) {
                parent = parent.parent;
              }

              if (parent) {
                return conditionallyVisibleRecursive(components[parent.key]);
              }
            }

            // Base case (top of chain)
            return true;
          };

          // Instantiate a Webform to grab an initialized i18next object from it
          const Webform = require('formiojs/Webform').default;
          const i18next = (new Webform()).i18next;

          // Use eachValue to apply validator to all components
          const validator = new Validator({
            form:       req.currentForm,
            submission: req.submission,
            db:         router.formio.mongoose,
            token:      req.headers['x-jwt-token']
          });

          let paths = {};

          const resultPromises = _.flattenDeep(
            await util.eachValue(req.currentForm.components, req.submission.data, context => {
              // Mark this as being a valid path for values in the submission object
              const path = _.compact([context.path, context.component.key]).join('.');
              paths[path] = true;

              // Skip validation if it's a custom component
              if (!ComponentClasses[context.component.type]) {
                return false;
              }

              // Skip validation if this is a PUT and this value isn't being updated
              if (req.method === 'PUT' && context.data === undefined) {
                return false;
              }

              // Instantiate the component
              const component = components[context.component.key];
              component.instance = new ComponentClasses[context.component.type](context.component, {
                i18n: i18next,
                readOnly: true,
                viewAsHtml: true
              }, context.data);

              // Apply field logic
              component.changed = component.instance.fieldLogic();

              if (component.changed) {
                component.schema = component.instance.component;
              }

              // Make the component aware of its actual path
              component.instance.path = _.compact([context.path, context.component.key]).join('.');

              // Skip validation if it's conditionally hidden
              const visible = conditionallyVisibleRecursive(component);

              if (!visible) {
                // Clear on hide according to property check
                paths[path] = !_.get(component, 'schema.clearOnHide', true);

                return false;
              }

              // Run validation
              return validator.check(component.instance, context.data);
            })
          );

          // Return any validation errors
          const errors = _.chain(await Promise.all(resultPromises)).flattenDeep().compact().value();

          if (errors.length) {
            return res.status(400).json({
              name: 'ValidationError',
              details: errors
            });
          }

          // Extend paths with the keys of any subforms so we include all subform metadata
          paths = _.chain(components)
            .filter(c => c.schema.type === 'form')
            .mapKeys(c => c.schema.key)
            .mapValues(c => true)
            .extend(paths)
            .value();

          // Build new submission data object that only includes data at valid paths
          const newData = {};

          _.forEach(paths, (visible, path) => {
            if (!visible) {
              return;
            }

            // See if a component at this path was changed during validation via conditional actions
            const component = _.find(components, c => _.get(c, 'instance.path') === path && c.changed);

            // If so, use the changed data instead of the input data
            const dataAtPath = component ? component.instance.dataValue : _.get(req.body.data, path);

            if (dataAtPath !== undefined) {
              _.set(newData, path, dataAtPath);
            }
          });

          // Update data references
          if (!_.isEmpty(newData)) {
            req.body.data = newData;
            req.submission.data = _.cloneDeep(newData);
            res.submission = {data: req.submission};
          }

          done();
        }
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
      // If they wish to disable actions, then just skip.
      if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
        return done();
      }

      async.eachOfSeries(req.flattenedComponents, (component, path, cb) => {
        if (
          req.body &&
          component.hasOwnProperty('persistent') &&
          !component.persistent
        ) {
          util.deleteProp(`data.${path}`)(req.body);
        }

        executeFieldHandler(component, path, validation, req.handlerName, req, res, cb);
      }, done);
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
