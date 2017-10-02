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

/**
 * @TODO: Add description.
 *
 * @param form
 * @param model
 * @constructor
 */
var Validator = function(form, model) {
  this.customValidations = [];
  this.schema = null;
  this.model = model;
  this.include = {};
  this.unique = {};
  this.form = form;
};

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
Validator.prototype.addValidator = function(schema, component, componentData) {
  var fieldValidator = null;
  if (
    !component ||
    (component.hasOwnProperty('key') && this.include.hasOwnProperty(component.key) && !this.include[component.key])
  ) {
    return;
  }

  // If the value must be unique.
  if (component.unique) {
    this.unique[component.key] = component;
  }

  // The value is persistent if it doesn't say otherwise or explicitly says so.
  var isPersistent = !component.hasOwnProperty('persistent') || component.persistent;

  // Add the custom validations.
  if (component.validate && component.validate.custom && isPersistent) {
    this.customValidations.push({component: component, row: componentData});
  }

  /* eslint-disable max-depth, valid-typeof */
  var objectSchema = {};
  switch (component.type) {
    case 'datagrid':
      component.components.forEach(function(itemComponent) {
        this.addValidator(objectSchema, itemComponent, _.get(componentData, component.key, componentData));
      }.bind(this));
      fieldValidator = Joi.array().items(Joi.object(objectSchema)).options({stripUnknown: false});
      break;
    case 'container':
      component.components.forEach(function(itemComponent) {
        this.addValidator(objectSchema, itemComponent, _.get(componentData, component.key, componentData));
      }.bind(this));
      fieldValidator = Joi.object(objectSchema);
      break;
    case 'fieldset':
    case 'panel':
    case 'well':
      component.components.forEach(function(itemComponent) {
        this.addValidator(schema, itemComponent, _.get(componentData, component.key, componentData));
      }.bind(this));
      break;
    case 'table':
      component.rows.forEach(function(row) {
        row.forEach(function(column) {
          column.components.forEach(function(itemComponent) {
            this.addValidator(schema, itemComponent, _.get(componentData, component.key, componentData));
          }.bind(this));
        }.bind(this));
      }.bind(this));
      break;
    case 'columns':
      component.columns.forEach(function(column) {
        column.components.forEach(function(itemComponent) {
          this.addValidator(schema, itemComponent, _.get(componentData, component.key, componentData));
        }.bind(this));
      }.bind(this));
      break;
    case 'textfield':
    case 'textarea':
    case 'phonenumber':
      fieldValidator = Joi.string().empty('');
      if (
        component.validate &&
        component.validate.hasOwnProperty('minLength') &&
        (typeof component.validate.minLength === 'number') &&
        component.validate.minLength >= 0
      ) {
        fieldValidator = fieldValidator.min(component.validate.minLength);
      }
      if (
        component.validate &&
        component.validate.hasOwnProperty('maxLength') &&
        (typeof component.validate.maxLength === 'number') &&
        component.validate.maxLength >= 0
      ) {
        fieldValidator = fieldValidator.max(component.validate.maxLength);
      }
      break;
    case 'email':
      fieldValidator = Joi.string().email().empty('');
      break;
    case 'number':
      fieldValidator = Joi.number().empty(null);
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

        _.each(['min', 'max', 'greater', 'less'], function(check) {
          if (component.validate.hasOwnProperty(check) && (typeof component.validate[check] === 'number')) {
            fieldValidator = fieldValidator[check](component.validate[check]);
          }
        });
      }
      break;
    case 'signature':
      fieldValidator = Joi.string().empty('');
      break;
    default:
      // Allow custom components to have subcomponents as well (like layout components).
      if (component.components && Array.isArray(component.components)) {
        component.components.forEach(function(itemComponent) {
          this.addValidator(
            component.tree ? objectSchema : schema,
            itemComponent,
            _.get(componentData, component.key, componentData)
          );
        }.bind(this));
      }
      fieldValidator = component.tree ? Joi.object(objectSchema) : Joi.any();
      break;
  }
  /* eslint-enable max-depth, valid-typeof */

  // Only run validations for persistent fields with values but not on embedded.
  if (component.key && (component.key.indexOf('.') === -1) && isPersistent && component.validate) {
    // Add required validator.
    if (component.validate.required) {
      fieldValidator = fieldValidator.required().empty();
    }

    // Add regex validator
    if (component.validate.pattern) {
      try {
        var regex = new RegExp(component.validate.pattern);
        fieldValidator = fieldValidator.regex(regex);
      }
      catch (err) {
        debug.error(err);
      }
    }
  }

  // Make sure to change this to an array if multiple is checked.
  if (component.multiple) {
    // Allow(null) was added since some text fields have empty strings converted to null when multiple which then
    // throws an error on re-validation. Allowing null fixes the issue.
    fieldValidator = Joi.array().sparse().items(fieldValidator.allow(null)).options({stripUnknown: false});
  }

  if (component.key && fieldValidator) {
    schema[component.key] = fieldValidator;
  }

  return schema;
};

/**
 * Using the submission, determine which fields need to be validated and ignored.
 *
 * @param {Object} submission
 *   The data submission object.
 */
Validator.prototype.sanitize = function(submission) {
  /**
   * Calculate whether custom logic evaluates to true or false.
   *
   * @private
   */
  var _evaluateCustomConditional = function(customLogic) {
    try {
      // Create the sandbox.
      var sandbox = vm.createContext({
        data: submission.data
      });

      // Execute the script.
      var script = new vm.Script(customLogic);
      script.runInContext(sandbox, {
        timeout: 250
      });

      if (util.isBoolean(sandbox.show)) {
        return util.boolean(sandbox.show);
      }
      else {
        return true;
      }
    }
    catch (e) {
      debug.validator('Custom Conditional Error: ');
      debug.validator(e);
      debug.error(e);
      // Default to true, if a validation error occurred.
      return true;
    }
  };

  /**
   * Check a specific component for wether it is visible or not based on conditional and custom logic.
   *
   * @param component
   * @returns {boolean}
   */
  var checkComponentVisibility = function(component) {
    if (!component.hasOwnProperty('key')) {
      return true;
    }

    // Custom conditional logic. Need special case so the eval is isolated an in a sandbox
    if (component.customConditional) {
      return _evaluateCustomConditional(component.customConditional);
    }

    let check = true;
    try {
      check = util.checkCondition(component, null, submission.data);
    }
    catch (err) {
      debug.error(err);
      check = true;
    }

    return check;
  };

  // Ensure this.form.components has a value.
  this.form = this.form || {};
  this.form.components = this.form.components || [];

  // Check to see if a component and its parents are visible.
  let isVisible = (component) => {
    if (component && component.key) {
      let parentVisible = !component.parent || isVisible(component.parent);
      return parentVisible && util.boolean(checkComponentVisibility(component));
    }
    return true;
  };

  // Create a visible grid and sanitized data.
  let omit = [];
  util.eachComponent(this.form.components, (component, path) => {
    let clearOnHide = util.isBoolean(component.clearOnHide) ? util.boolean(component.clearOnHide) : true;
    this.include[component.key] = !clearOnHide || isVisible(component);
    if (!this.include[component.key]) {
      omit.push(path);
    }
  }, false, '', this.form);

  // Sanitize the submission data.
  submission.data = _.omit(submission.data, omit);
};

/**
 * Using the form, ignore list and unique list, build the joi schema for validation.
 *
 * @param {Object} submission
 *   The data submission object.
 */
Validator.prototype.buildSchema = function(submission) {
  // Build the Joi validation schema.
  var keys = {
    // Start off with the _id key.
    _id: Joi.string().meta({primaryKey: true})
  };

  // Add a validator for each component in the form, with its componentData.
  _.each(this.form.components, function(component) {
    this.addValidator(keys, component, _.get(submission.data, component.key, submission.data));
  }.bind(this));

  // Create the validator schema.
  this.schema = Joi.object().keys(keys);
};

/**
 * Validate a submission for a form.
 *
 * @param {Object} submission
 *   The data submission object.
 * @param next
 *   The callback function to pass the results.
 */
/* eslint-disable max-statements */
Validator.prototype.validate = function(submission, next) {
  var valid = true;
  var error = [];
  debug.validator('Starting validation');

  // Skip validation if no data is provided.
  if (!submission.data) {
    debug.validator('No data skipping validation');
    debug.validator(submission);
    return next();
  }

  // Sanitize the submission.
  this.sanitize(submission);

  // Build the validator schema.
  this.buildSchema(submission);

  // Check for custom validations.
  for (var a = 0; a < this.customValidations.length; a++) {
    var component = this.customValidations[a].component;
    var row = this.customValidations[a].row;

    if (!(row instanceof Array)) {
      row = [row];
    }

    // If a component has multiple rows of data, e.g. Datagrids, validate each row of data on the backend.
    for (var b = 0; b < row.length; b++) {
      var _row = row[b];

      debug.validator('Data (' + component.key + '):');
      debug.validator(_row);

      // Try a new sandboxed validation.
      try {
        // Replace with variable substitutions.
        var replace = /({{\s{0,}(.*[^\s]){1}\s{0,}}})/g;
        component.validate.custom = component.validate.custom.replace(replace, function(match, $1, $2) {
          return _.get(submission.data, $2);
        });
        debug.validator(component.validate.custom);

        // Create the sandbox.
        var sandbox = vm.createContext({
          input: (typeof _row === 'object') ? util.getValue({data: _row}, component.key) : _row,
          data: submission.data,
          row: _row,
          scope: {data: submission.data},
          component: component,
          valid: valid
        });

        // Execute the script.
        var script = new vm.Script(component.validate.custom);
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
        error.push({
          message: valid,
          path: component.key,
          type: component.type + '.custom'
        });
      }
    }
  }

  // Iterate through each of the unique keys.
  var uniques = _.keys(this.unique);

  // Iterate the list of components one time to build the path map.
  var paths = {};
  util.eachComponent(this.form.components, function(component, path) {
    if (component.hasOwnProperty('key')) {
      paths[component.key] = path;
    }
  }, true);

  async.eachSeries(uniques, function(key, done) {
    var component = this.unique[key];

    debug.validator('Key: ' + key);
    // Skip validation of this field, because data wasn't included.
    var data = _.get(submission.data, _.get(paths, key));
    debug.validator(data);
    if (!data) {
      debug.validator('Skipping Key: ' + key);
      return done();
    }
    if (_.isEmpty(data)) {
      debug.validator('Skipping Key: ' + key + ', typeof: ' + typeof data);
      return done();
    }

    // Get the query.
    var query = {form: util.idToBson(submission.form)};
    if (typeof data === 'string') {
      query['data.' + _.get(paths, key)] = {$regex: new RegExp('^' + util.escapeRegExp(data) + '$'), $options: 'i'};
    }
    // FOR-213 - Pluck the unique location id
    else if (
      (typeof data !== 'string') &&
      data.hasOwnProperty('address_components') &&
      data.hasOwnProperty('place_id')
    ) {
      var _path = 'data.' + _.get(paths, key) + '.place_id';
      query[_path] = {$regex: new RegExp('^' + util.escapeRegExp(data.place_id) + '$'), $options: 'i'};
    }
    // Compare the contents of arrays vs the order.
    else if (data instanceof Array) {
      query['data.' + _.get(paths, key)] = {$all: data};
    }

    // Only search for non-deleted items.
    if (!query.hasOwnProperty('deleted')) {
      query['deleted'] = {$eq: null};
    }

    // Try to find an existing value within the form.
    debug.validator(query);
    this.model.findOne(query, function(err, result) {
      if (err) {
        debug.validator(err);
        return done(err);
      }
      if (result && submission._id && (result._id.toString() === submission._id)) {
        return done();
      }
      if (result) {
        return done(new Error(component.label + ' must be unique.'));
      }

      done();
    });
  }.bind(this), function(err) {
    if (err) {
      return next(err.message);
    }

    Joi.validate(submission.data, this.schema, {stripUnknown: true, abortEarly: false}, function(validateErr, value) {
      if (validateErr) {
        // Add in custom errors.
        validateErr.details = validateErr.details.concat(error);
        debug.validator(validateErr);
        return next(validateErr);
      }
      // If custom errors were found but not joi errors.
      if (error.length > 0) {
        debug.validator('Errors were found.');
        return next({name: 'ValidationError', details: error});
      }

      submission.data = value;
      next(null, value);
    });
  }.bind(this));
};
/* eslint-enable max-statements */

module.exports = Validator;
