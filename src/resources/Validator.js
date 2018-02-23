'use strict';

const vm = require('vm');
const Joi = require('joi');
const _ = require('lodash');
const util = require('../util/util');
const FormioUtils = require('formiojs/utils');
const request = require('request');

const debug = {
  validator: require('debug')('formio:validator'),
  error: require('debug')('formio:error')
};

/*
 * Returns true or false based on visibility.
 *
 * @param {Object} component
 *   The form component to check.
 * @param {Object} row
 *   The local data to check.
 * @param {Object} data
 *   The full submission data.
 */
const checkConditional = (component, row, data, recurse = false) => {
  let isVisible = true;

  if (!component || !component.hasOwnProperty('key')) {
    return isVisible;
  }

  // Custom conditional logic. Need special case so the eval is isolated in a sandbox
  if (component.customConditional) {
    try {
      // Create the sandbox.
      const sandbox = vm.createContext({
        data,
        row
      });

      // Execute the script.
      const script = new vm.Script(component.customConditional);
      script.runInContext(sandbox, {
        timeout: 250
      });

      if (util.isBoolean(sandbox.show)) {
        isVisible = util.boolean(sandbox.show);
      }
    }
    catch (e) {
      debug.validator('Custom Conditional Error: ');
      debug.validator(e);
      debug.error(e);
    }
  }
  else {
    try {
      isVisible = util.checkCondition(component, row, data);
    }
    catch (err) {
      debug.error(err);
    }
  }

  // If visible and recurse, continue down tree to check parents.
  if (isVisible && recurse && component.parent.type !== 'form') {
    return !component.parent || checkConditional(component.parent, row, data, true);
  }
  else {
    return isVisible;
  }
};

const getRules = (type) => [
  {
    name: 'custom',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      const component = params.component;
      const data = params.data;
      let row = state.parent;
      let valid = true;

      if (!_.isArray(row)) {
        row = [row];
      }

      // If a component has multiple rows of data, e.g. Datagrids, validate each row of data on the backend.
      for (let b = 0; b < row.length; b++) {
        const _row = row[b];

        // Try a new sandboxed validation.
        try {
          // Replace with variable substitutions.
          const replace = /({{\s{0,}(.*[^\s]){1}\s{0,}}})/g;
          component.validate.custom = component.validate.custom.replace(replace, (match, $1, $2) =>  _.get(data, $2));

          // Create the sandbox.
          const sandbox = vm.createContext({
            input: _.isObject(_row) ? util.getValue({data: _row}, component.key) : _row,
            data,
            row: _row,
            scope: {data},
            component: component,
            valid: valid
          });

          // Execute the script.
          const script = new vm.Script(component.validate.custom);
          script.runInContext(sandbox, {
            timeout: 100
          });
          valid = sandbox.valid;
        }
        catch (err) {
          // Say this isn't valid based on bad code executed...
          valid = err.toString();
        }

        // If there is an error, then set the error object and break from iterations.
        if (valid !== true) {
          return this.createError(`${type}.custom`, {message: valid}, state, options);
        }
      }

      return value; // Everything is OK
    }
  },
  {
    name: 'json',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      const component = params.component;
      const data = params.data;
      let row = state.parent;
      let valid = true;

      if (!_.isArray(row)) {
        row = [row];
      }

      // If a component has multiple rows of data, e.g. Datagrids, validate each row of data on the backend.
      for (let b = 0; b < row.length; b++) {
        const _row = row[b];

        try {
          valid = util.jsonLogic.apply(component.validate.json, {
            data,
            row: _row
          });
        }
        catch (err) {
          valid = err.message;
        }

        // If there is an error, then set the error object and break from iterations.
        if (valid !== true) {
          return this.createError(`${type}.json`, {message: valid}, state, options);
        }
      }

      return value; // Everything is OK
    }
  },
  {
    name: 'hidden',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      // If we get here than the field has thrown an error.
      // If we are hidden, sanitize the data and return true to override the error.
      // If not hidden, return an error so the original error remains on the field.

      const component = params.component;
      const data = params.data;
      const row = state.parent;

      const isVisible = checkConditional(component, row, data, true);

      if (isVisible) {
        return value;
      }

      return this.createError(`${type}.hidden`, {message: 'hidden with value'}, state, options);
    }
  },
  {
    name: 'select',
    params: {
      component: Joi.any(),
      submission: Joi.any(),
      token: Joi.any(),
      async: Joi.any()
    },
    validate(params, value, state, options) {
      // Empty values are fine.
      if (!value) {
        return value;
      }

      const component = params.component;
      const submission = params.submission;
      const token = params.token;
      const async = params.async;

      // Initialize the request options.
      const requestOptions = {
        url: _.get(component, 'validate.select'),
        method: 'GET',
        qs: {},
        json: true,
        headers: {}
      };

      // If the url is a boolean value.
      if (util.isBoolean(requestOptions.url)) {
        requestOptions.url = util.boolean(requestOptions.url);
        if (!requestOptions.url) {
          return value;
        }

        if (component.dataSrc !== 'url') {
          return value;
        }

        if (!component.data.url || !component.searchField) {
          return value;
        }

        // Get the validation url.
        requestOptions.url = component.data.url;

        // Add the search field.
        requestOptions.qs[component.searchField] = value;

        // Add the filters.
        if (component.filter) {
          requestOptions.url += (!requestOptions.url.includes('?') ? '?' : '&') + component.filter;
        }

        // If they only wish to return certain fields.
        if (component.selectFields) {
          requestOptions.qs.select = component.selectFields;
        }
      }

      if (!requestOptions.url) {
        return value;
      }

      // Make sure to interpolate.
      requestOptions.url = FormioUtils.interpolate(requestOptions.url, {
        data: submission.data
      });

      // Set custom headers.
      if (component.data && component.data.headers) {
        _.each(component.data.headers, (header) => {
          if (header.key) {
            requestOptions.headers[header.key] = header.value;
          }
        });
      }

      // Set form.io authentication.
      if (component.authenticate && token) {
        requestOptions.headers['x-jwt-token'] = token;
      }

      async.push(new Promise((resolve, reject) => {
        // Make the request.
        request(requestOptions, (err, response, body) => {
          if (err) {
            return resolve({
              message: `Select validation error: ${err}`,
              path: state.path,
              type: 'any.select'
            });
          }

          if (response && parseInt(response.statusCode / 100, 10) !== 2) {
            return resolve({
              message: `Select validation error: ${body}`,
              path: state.path,
              type: 'any.select'
            });
          }

          if (!body || !body.length) {
            return resolve({
              message: `"${value}" for "${component.label || component.key}" is not a valid selection.`,
              path: state.path,
              type: 'any.select'
            });
          }

          // This is a valid selection.
          return resolve(null);
        });
      }));

      return value;
    }
  },
  {
    name: 'distinct',
    params: {
      component: Joi.any(),
      submission: Joi.any(),
      model: Joi.any(),
      async: Joi.any()
    },
    validate(params, value, state, options) {
      const component = params.component;
      const submission = params.submission;
      const model = params.model;
      const async = params.async;

      const path = `data.${state.path.join('.')}`;

      // Allow empty.
      if (!value) {
        return value;
      }
      if (_.isEmpty(value)) {
        return value;
      }

      // Get the query.
      const query = {form: util.idToBson(submission.form)};
      if (_.isString(value)) {
        query[path] = {$regex: new RegExp(`^${util.escapeRegExp(value)}$`), $options: 'i'};
      }
      // FOR-213 - Pluck the unique location id
      else if (
        !_.isString(value) &&
        value.hasOwnProperty('address_components') &&
        value.hasOwnProperty('place_id')
      ) {
        query[`${path}.place_id`] = {$regex: new RegExp(`^${util.escapeRegExp(value.place_id)}$`), $options: 'i'};
      }
      // Compare the contents of arrays vs the order.
      else if (_.isArray(value)) {
        query[path] = {$all: value};
      }

      // Only search for non-deleted items.
      if (!query.hasOwnProperty('deleted')) {
        query['deleted'] = {$eq: null};
      }

      async.push(new Promise((resolve, reject) => {
        // Try to find an existing value within the form.
        model.findOne(query, (err, result) => {
          if (err) {
            return resolve({
              message: err,
              path: state.path,
              type: 'any.unique'
            });
          }
          else if (result && submission._id && (result._id.toString() === submission._id)) {
            // This matches the current submission which is allowed.
            return resolve(null);
          }
          else if (result) {
            return resolve({
              message: `"${component.label}" must be unique.`,
              path: state.path,
              type: 'any.unique'
            });
          }
          return resolve(null);
        });
      }));

      return value; // Everything is OK
    }
  }
];

const JoiX = Joi.extend([
  {
    name: 'any',
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('any')
  },
  {
    name: 'string',
    base: Joi.string(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('string')
  },
  {
    name: 'array',
    base: Joi.array(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('array')
  },
  {
    name: 'object',
    base: Joi.object(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('object')
  },
  {
    name: 'number',
    base: Joi.number(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('number')
  },
  {
    name: 'boolean',
    base: Joi.boolean(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('boolean')
  },
  {
    name: 'date',
    base: Joi.date(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('date')
  }
]);

/**
 * @TODO: Add description.
 *
 * @param form
 * @param model
 * @constructor
 */
class Validator {
  constructor(form, model, token) {
    this.model = model;
    this.async = [];
    this.form = form;
    this.token = token;
  }

  /**
   * Returns a validator per component.
   *
   * @param {Object} schema
   *   The validation schema to modify.
   * @param {Object} component
   *   The form component.
   * @param {Object} componentData
   *   The submission data corresponding to this component.
   */
  buildSchema(schema, components, componentData, submission) {
    // Add a validator for each component in the form, with its componentData.
    /* eslint-disable max-statements */
    components.forEach((component) => {
      let fieldValidator = null;

      this.applyLogic(component, componentData, submission.data);

      // The value is persistent if it doesn't say otherwise or explicitly says so.
      const isPersistent = !component.hasOwnProperty('persistent') || component.persistent;

      let objectSchema;
      /* eslint-disable max-depth, valid-typeof */
      switch (component.type) {
        case 'form': {
          // Ensure each sub submission at least has an empty object or it won't validate.
          _.update(componentData, `${component.key}.data`, value => value ? value : {});

          const subSubmission = _.get(componentData, component.key, {});

          // If this has already been submitted, then it has been validated.
          if (!subSubmission._id && component.components) {
            const formSchema = this.buildSchema(
              {},
              component.components,
              subSubmission,
              subSubmission
            );
            fieldValidator = JoiX.object().unknown(true).keys({
              data: JoiX.object().keys(formSchema)
            });
          }
          else {
            fieldValidator = JoiX.object();
          }
          break;
        }
        case 'editgrid':
        case 'datagrid':
          component.multiple = false;
          objectSchema = this.buildSchema(
            {},
            component.components,
            _.get(componentData, component.key, componentData),
            submission
          );

          fieldValidator = JoiX.array().items(JoiX.object().keys(objectSchema)).options({stripUnknown: false});
          break;
        case 'container':
          objectSchema = this.buildSchema(
            {},
            component.components,
            _.get(componentData, component.key, componentData),
            submission
          );

          fieldValidator = JoiX.object().keys(objectSchema);
          break;
        case 'fieldset':
        case 'panel':
        case 'well':
          this.buildSchema(schema, component.components, componentData, submission);
          break;
        case 'table':
          component.rows.forEach((row) => {
            row.forEach((column) => {
              this.buildSchema(schema, column.components, componentData, submission);
            });
          });
          break;
        case 'columns':
          component.columns.forEach((column) => {
            this.buildSchema(schema, column.components, componentData, submission);
          });
          break;
        case 'textfield':
        case 'textarea':
        case 'phonenumber':
          fieldValidator = JoiX.string().allow('');
          if (
            component.validate &&
            component.validate.hasOwnProperty('minLength') &&
            _.isNumber(component.validate.minLength) &&
            component.validate.minLength >= 0
          ) {
            fieldValidator = fieldValidator.min(component.validate.minLength);
          }
          if (
            component.validate &&
            component.validate.hasOwnProperty('maxLength') &&
            _.isNumber(component.validate.maxLength) &&
            component.validate.maxLength >= 0
          ) {
            fieldValidator = fieldValidator.max(component.validate.maxLength);
          }
          break;
        case 'select':
          if (component.validate && component.validate.select) {
            fieldValidator = JoiX.any().select(component, submission, this.token, this.async);
          }
          fieldValidator = fieldValidator || JoiX.any();
          break;
        case 'email':
          fieldValidator = JoiX.string().email().allow('');
          break;
        case 'number':
          fieldValidator = JoiX.number().empty(null);
          if (component.validate) {
            // If the step is provided... we can infer float vs. integer.
            if (component.validate.step && (component.validate.step !== 'any')) {
              const parts = component.validate.step.split('.');
              if (parts.length === 1) {
                fieldValidator = fieldValidator.integer();
              }
              else {
                fieldValidator = fieldValidator.precision(parts[1].length);
              }
            }

            _.each(['min', 'max', 'greater', 'less'], (check) => {
              if (component.validate.hasOwnProperty(check) && _.isNumber(component.validate[check])) {
                fieldValidator = fieldValidator[check](component.validate[check]);
              }
            });
          }
          break;
        case 'signature':
          fieldValidator = JoiX.string().allow('');
          break;
        case 'checkbox':
          if (component.name && !_.find(components, ['key', component.name])) {
            schema[component.name] = JoiX.any();
          }
          fieldValidator = fieldValidator || JoiX.any();
          break;
        default:
          // Allow custom components to have subcomponents as well (like layout components).
          if (component.components && Array.isArray(component.components)) {
            if (component.tree) {
              objectSchema = this.buildSchema(
                {},
                component.components,
                _.get(componentData, component.key, componentData),
                submission
              );
              fieldValidator = JoiX.object().keys(objectSchema);
            }
            else {
              this.buildSchema(
                schema,
                component.components,
                componentData,
                submission
              );
            }
          }
          fieldValidator = fieldValidator || JoiX.any();
          break;
      }
      /* eslint-enable max-depth, valid-typeof */

      if (component.key && (component.key.indexOf('.') === -1) && component.validate) {
        // Add required validator.
        if (component.validate.required) {
          fieldValidator = fieldValidator.required().empty().disallow('', null);
        }

        // Add regex validator
        if (component.validate.pattern) {
          try {
            const regex = new RegExp(component.validate.pattern);
            fieldValidator = fieldValidator.regex(regex);
          }
          catch (err) {
            debug.error(err);
          }
        }

        // Add the custom validations.
        if (component.validate && component.validate.custom) {
          fieldValidator = fieldValidator.custom(component, submission.data);
        }

        // Add the json logic validations.
        if (component.validate && component.validate.json) {
          fieldValidator = fieldValidator.json(component, submission.data);
        }
      }

      // If the value must be unique.
      if (component.unique) {
        fieldValidator = fieldValidator.distinct(component, submission, this.model, this.async);
      }

      // Make sure to change this to an array if multiple is checked.
      if (component.multiple) {
        // Allow(null) was added since some text fields have empty strings converted to null when multiple which then
        // throws an error on re-validation. Allowing null fixes the issue.
        fieldValidator = JoiX.array().sparse().items(fieldValidator.allow(null)).options({stripUnknown: false});
        // If a multi-value is required, make sure there is at least one.
        if (component.validate && component.validate.required) {
          fieldValidator = fieldValidator.min(1).required();
        }
      }

      // Only run validations for persistent fields.
      if (component.key && fieldValidator && isPersistent) {
        schema[component.key] = fieldValidator.hidden(component, submission.data);
      }
    });
    /* eslint-enable max-statements */

    return schema;
  }

  applyLogic(component, row, data) {
    if (!component.logic || !Array.isArray(component.logic)) {
      return;
    }

    component.logic.forEach(logic => {
      const result = FormioUtils.checkTrigger(component, logic.trigger, row, data);

      if (result) {
        logic.actions.forEach(action => {
          switch (action.type) {
            case 'property':
              FormioUtils.setActionProperty(component, action, row, data, component, result);
              break;
            case 'value':
              try {
                // Create the sandbox.
                const sandbox = vm.createContext({
                  value: row[component.key],
                  data,
                  row,
                  component,
                  result
                });

                // Execute the script.
                const script = new vm.Script(action.value);
                script.runInContext(sandbox, {
                  timeout: 250
                });

                row[component.key] = sandbox.value.toString();
              }
              catch (e) {
                debug.validator('Custom Logic Error: ');
                debug.validator(e);
                debug.error(e);
              }
              break;
          }
        });
      }
    });
  }

  /**
   * Validate a submission for a form.
   *
   * @param {Object} submission
   *   The data submission object.
   * @param next
   *   The callback function to pass the results.
   */
  /* eslint-disable max-statements */
  validate(submission, next) {
    debug.validator('Starting validation');

    // Skip validation if no data is provided.
    if (!submission.data) {
      debug.validator('No data skipping validation');
      debug.validator(submission);
      return next();
    }

    // Build the JoiX validation schema.
    let schema = {
      // Start off with the _id key.
      _id: JoiX.string().meta({primaryKey: true})
    };

    // Create the validator schema.
    schema = JoiX.object().keys(this.buildSchema(schema, this.form.components, submission.data, submission));

    // Iterate the list of components one time to build the path map.
    const components = {};
    util.eachComponent(this.form.components, (component, path) => {
      if (component.hasOwnProperty('key')) {
        components[path] = component;
      }
    }, true, '', true);

    JoiX.validate(submission.data, schema, {stripUnknown: true, abortEarly: false}, (validateErr, value) => {
      // Wait for all async validators to complete and add any errors.
      Promise.all(this.async).then(errors => {
        errors = errors.filter(item => item);
        // Add in any asyncronous errors.
        if (errors.length) {
          if (!validateErr) {
            validateErr = new Error('Validation failed');
            validateErr.name = 'ValidationError';
            validateErr.details = errors;
          }
          else {
            validateErr.details = validateErr.details.concat(errors);
          }
        }
        if (validateErr) {
          // Remove any conditionally hidden validations. Joi will still throw the errors but we don't want them since the
          // fields are hidden.
          validateErr.details = validateErr.details.filter((detail) => {
            let result = {
              hidden: false
            };
            if (detail.type.includes('.hidden')) {
              const component = components[detail.path.filter(isNaN).join('.')];

              const clearOnHide = util.isBoolean(component.clearOnHide) ?
                util.boolean(component.clearOnHide) : true;

              if (clearOnHide) {
                _.unset(value, detail.path);
              }

              result.hidden = true;
            }
            else {
              // Walk up the path tree to determine if the component is hidden.
              result = detail.path.reduce((result, key) => {
                result.path.push(key);

                const component = components[result.path.filter(isNaN).join('.')];

                // Form "data" keys don't have components.
                if (component) {
                  result.hidden = result.hidden ||
                    !checkConditional(component,
                      _.get(value, result.path.slice(0, result.path.length - 1)), result.submission, true);

                  const clearOnHide = util.isBoolean(component.clearOnHide) ?
                    util.boolean(component.clearOnHide) : true;

                  if (clearOnHide && result.hidden) {
                    _.unset(value, result.path);
                  }
                }
                else {
                  // Since this is a subform, change the submission object going to the conditionals.
                  result.submission = _.get(value, result.path);
                }

                return result;
              }, {path: [], hidden: false, submission: value});
            }

            return !result.hidden;
          });

          // Only throw error if there are still errors.
          if (validateErr.details.length) {
            validateErr._validated = value;

            return next(validateErr);
          }
          else {
            validateErr._object = value;
          }
        }

        submission.data = value;
        next(null, value);
      });
    });
  }
  /* eslint-enable max-statements */
}

module.exports = Validator;
