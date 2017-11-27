'use strict';

const vm = require('vm');
const Joi = require('joi');
const _ = require('lodash');
const util = require('../util/util');
const async = require('async');

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

  if (!component.hasOwnProperty('key')) {
    return isVisible;
  }

  // Custom conditional logic. Need special case so the eval is isolated an in a sandbox
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

  if (recurse) {
    return isVisible && (!component.parent || checkConditional(component.parent, row, data, true));
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
          debug.validator(valid);
        }
        catch (err) {
          debug.error(err);
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
    name: 'distinct',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      let row = state.parent;

      if (!_.isArray(row)) {
        row = [row];
      }

      // Todo.

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
  constructor(form, model) {
    this.model = model;
    this.unique = {};
    this.form = form;
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
  buildSchema(schema, components, componentData, submissionData) {
    // Add a validator for each component in the form, with its componentData.
    /* eslint-disable max-statements */
    components.forEach((component) => {
      let fieldValidator = null;

      // If the value must be unique.
      if (component.unique) {
        this.unique[component.key] = component;
      }

      // The value is persistent if it doesn't say otherwise or explicitly says so.
      const isPersistent = !component.hasOwnProperty('persistent') || component.persistent;

      let objectSchema;
      /* eslint-disable max-depth, valid-typeof */
      switch (component.type) {
        case 'editgrid':
        case 'datagrid':
          component.multiple = false;
          objectSchema = this.buildSchema(
            {},
            component.components,
            _.get(componentData, component.key, componentData),
            submissionData
          );

          fieldValidator = JoiX.array().items(JoiX.object().keys(objectSchema)).options({stripUnknown: false});
          break;
        case 'container':
          objectSchema = this.buildSchema(
            {},
            component.components,
            _.get(componentData, component.key, componentData),
            submissionData
          );

          fieldValidator = JoiX.object().keys(objectSchema);
          break;
        case 'fieldset':
        case 'panel':
        case 'well':
          this.buildSchema(schema, component.components, componentData, submissionData);
          break;
        case 'table':
          component.rows.forEach((row) => {
            row.forEach((column) => {
              this.buildSchema(schema, column.components, componentData, submissionData);
            });
          });
          break;
        case 'columns':
          component.columns.forEach((column) => {
            this.buildSchema(schema, column.components, componentData, submissionData);
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
        case 'email':
          fieldValidator = JoiX.string().email().allow('');
          break;
        case 'number':
          fieldValidator = JoiX.number().empty(null);
          if (component.validate) {
            // If the step is provided... we can infer float vs. integer.
            if (component.validate.step && (component.validate.step !== 'any')) {
              var parts = component.validate.step.split('.');
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
                submissionData
              );
              fieldValidator = JoiX.object().keys(objectSchema);
            }
            else {
              this.buildSchema(
                schema,
                component.components,
                componentData,
                submissionData
              );
            }
          }
          fieldValidator = fieldValidator || JoiX.any();
          break;
      }
      /* eslint-enable max-depth, valid-typeof */

      // Only run validations for persistent fields with values but not on embedded.
      if (component.key && (component.key.indexOf('.') === -1) && isPersistent && component.validate) {
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
          fieldValidator = fieldValidator.custom(component, submissionData);
        }

        // Add the json logic validations.
        if (component.validate && component.validate.json) {
          fieldValidator = fieldValidator.json(component, submissionData);
        }
      }

      // Make sure to change this to an array if multiple is checked.
      if (component.multiple) {
        // Allow(null) was added since some text fields have empty strings converted to null when multiple which then
        // throws an error on re-validation. Allowing null fixes the issue.
        fieldValidator = JoiX.array().sparse().items(fieldValidator.allow(null)).options({stripUnknown: false});
      }

      if (component.key && fieldValidator) {
        schema[component.key] = fieldValidator.hidden(component, submissionData);
      }
    });
    /* eslint-enable max-statements */

    return schema;
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
    schema = JoiX.object().keys(this.buildSchema(schema, this.form.components, submission.data, submission.data));

    // Iterate through each of the unique keys.
    const uniques = _.keys(this.unique);

    // Iterate the list of components one time to build the path map.
    const paths = {};
    const components = {};
    util.eachComponent(this.form.components, (component, path) => {
      if (component.hasOwnProperty('key')) {
        paths[component.key] = path;
        components[component.key] = component;
      }
    }, true, '', true);

    async.eachSeries(uniques, (key, done) => {
      const component = this.unique[key];

      debug.validator(`Key: ${key}`);
      // Skip validation of this field, because data wasn't included.
      const data = _.get(submission.data, _.get(paths, key));
      debug.validator(data);
      if (!data) {
        debug.validator(`Skipping Key: ${key}`);
        return done();
      }
      if (_.isEmpty(data)) {
        debug.validator(`Skipping Key: ${key}, typeof: ${typeof data}`);
        return done();
      }

      // Get the query.
      const query = {form: util.idToBson(submission.form)};
      if (_.isString(data)) {
        query[`data.${_.get(paths, key)}`] = {$regex: new RegExp(`^${util.escapeRegExp(data)}$`), $options: 'i'};
      }
      // FOR-213 - Pluck the unique location id
      else if (
        !_.isString(data) &&
        data.hasOwnProperty('address_components') &&
        data.hasOwnProperty('place_id')
      ) {
        const _path = `data.${_.get(paths, key)}.place_id`;
        query[_path] = {$regex: new RegExp(`^${util.escapeRegExp(data.place_id)}$`), $options: 'i'};
      }
      // Compare the contents of arrays vs the order.
      else if (_.isArray(data)) {
        query[`data.${_.get(paths, key)}`] = {$all: data};
      }

      // Only search for non-deleted items.
      if (!query.hasOwnProperty('deleted')) {
        query['deleted'] = {$eq: null};
      }

      // Try to find an existing value within the form.
      debug.validator(query);
      this.model.findOne(query, (err, result) => {
        if (err) {
          debug.validator(err);
          return done(err);
        }
        if (result && submission._id && (result._id.toString() === submission._id)) {
          return done();
        }
        if (result) {
          return done(new Error(`${component.label} must be unique.`));
        }

        done();
      });
    }, (err) => {
      if (err) {
        return next(err.message);
      }

      JoiX.validate(submission.data, schema, {stripUnknown: true, abortEarly: false}, (validateErr, value) => {
        if (validateErr) {
          // Remove any conditionally hidden validations. Joi will still throw the errors but we don't want them since the
          // fields are hidden.
          validateErr.details = validateErr.details.filter((detail) => {
            // Walk up the path tree to determine if the component is hidden.
            const result = detail.path.reduce((result, key) => {
              if (!isNaN(key)) {
                result.path.push(key);
              }
              else {
                const component = components[key];

                result.hidden = result.hidden || !checkConditional(component, _.get(value, result.path), value, true);

                const clearOnHide = util.isBoolean(component.clearOnHide) ? util.boolean(component.clearOnHide) : true;

                result.path.push(key);
                if (clearOnHide && result.hidden) {
                  _.unset(value, result.path);
                }
              }

              return result;
            }, {path: [], hidden: detail.type.includes('.hidden')});

            return !result.hidden;
          });

          // Only throw error if there are still errors.
          if (validateErr.details.length) {
            debug.validator(validateErr);

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
