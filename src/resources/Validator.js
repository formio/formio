'use strict';

var Joi = require('joi');
var _ = require('lodash');
var vm = require('vm');
var util = require('../util/util');
var async = require('async');
var debug = {
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
  this.ignore = {};
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
  if (!component || (component.hasOwnProperty('key') && this.ignore.hasOwnProperty(component.key))) {
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
      fieldValidator = Joi.array().items(Joi.object(objectSchema));
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
          this.addValidator(component.tree ? objectSchema : schema, itemComponent, _.get(componentData, component.key, componentData));
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
    fieldValidator = Joi.array().sparse().items(fieldValidator);
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
Validator.prototype.buildIgnoreList = function(submission) {
  // Build the display map.
  var show = {
    '': true,
    'undefined': true,
    'null': true
  };
  var boolean = {
    'true': true,
    'false': false
  };

  /**
   * Sweep the current submission, to identify and remove data that has been conditionally hidden.
   *
   * This will iterate over every key in the submission data obj, regardless of the structure.
   */
  var sweepSubmission = function() {
    /**
     * Sweep the given component keys and remove any data for the given keys which are being conditionally hidden.
     *
     * @param {Object} components
     *   The list of components to sweep.
     * @param {Boolean} ret
     *   Whether or not you want to know if a modification needs to be made.
     */
    var sweep = function sweep(components, ret) {
      // Skip our unwanted types.
      if (components === null || typeof components === 'undefined') {
        if (ret) {
          return false;
        }
        return;
      }

      // If given a string, then we are looking at the api key of a component.
      if (typeof components === 'string') {
        if (show.hasOwnProperty(components) && show[components] === false) {
          if (ret) {
            return true;
          }
        }

        return;
      }
      // If given an array, iterate over each element, assuming its not a string itself.
      // If each element is a string, then we aren't looking at a component, but data itself.
      else if (components instanceof Array) {
        var filtered = [];

        components.forEach(function(component) {
          if (typeof component === 'string') {
            filtered.push(component);
            return;
          }

          // Recurse into the components of this component.
          var modified = sweep(component, true);
          if (!modified) {
            filtered.push(component);
          }
        });

        components = filtered;
        return;
      }
      // If given an object, iterate the properties as component keys.
      else if (typeof components === 'object') {
        Object.keys(components).forEach(function(key) {
          // If the key is deleted, delete the whole obj.
          var modifiedKey = sweep(key, true);
          if (modifiedKey) {
            delete components[key];
          }
          else {
            // If a child leaf is modified (non key) delete its whole subtree.
            if (components[key] instanceof Array || typeof components[key] === 'object') {
              // If the component can have sub-components, recurse.
              sweep(components[key]);
            }
          }
        });
        return;
      }

      return;
    };
    return sweep(submission.data || {});
  };

  /**
   * Calculate whether the conditional settings evaluate to true or false.
   *
   * @private
   */
  var _evaluateConditional = function(conditional) {
    var value = util.getValue(submission, conditional.when);

    if (typeof value !== 'undefined' && typeof value !== 'object') {
      // Check if the conditional value is equal to the trigger value
      return value.toString() === conditional.eq.toString()
        ? boolean[conditional.show]
        : !boolean[conditional.show];
    }
    // Special check for check boxes component.
    else if (typeof value !== 'undefined' && typeof value === 'object') {
      // Only update the visibility is present, otherwise hide, because it was deleted by the submission sweep.
      if (value.hasOwnProperty(conditional.eq)) {
        return boolean.hasOwnProperty(value[conditional.eq])
          ? boolean[value[conditional.eq]]
          : true;
      }
      else {
        return false;
      }
    }
    // Check against the components default value, if present and the components hasnt been interacted with.
    else if (typeof value === 'undefined' && conditional.hasOwnProperty('defaultValue')) {
      return conditional.defaultValue.toString() === conditional.eq.toString()
        ? boolean[conditional.show]
        : !boolean[conditional.show];
    }
    // If there is no value, we still need to process as not equal.
    else {
      return !boolean[conditional.show];
    }
  };

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

      if (boolean.hasOwnProperty(sandbox.show)) {
        return boolean[sandbox.show];
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

    // We only care about valid/complete conditional settings.
    if (
      component.conditional
      && (component.conditional.show !== null && component.conditional.show !== '')
      && (component.conditional.when !== null && component.conditional.when !== '')
    ) {
      // Default the conditional values.
      component.conditional.show = boolean.hasOwnProperty(component.conditional.show)
        ? boolean[component.conditional.show]
        : true;
      component.conditional.eq = component.conditional.eq || '';

      var conditional = component.conditional;

      // Store the components default value for conditional logic, if present.
      if (component.hasOwnProperty('defaultValue')) {
        conditional.defaultValue = component.defaultValue;
      }
      return _evaluateConditional(conditional);
    }
    // Custom conditional logic.
    else if (component.customConditional) {
      return _evaluateCustomConditional(component.customConditional);
    }

    // If neither conditional nor custom logic is set, it is visibile.
    return true;
  };

  /**
   * Check the visibility of each component recursively.
   *
   * @param components
   */
  var checkVisibility = function(components, parentVisibility) {
    parentVisibility = (typeof parentVisibility !== 'undefined' ? parentVisibility : true);

    components.forEach(function(component) {
      var visible = true;
      // If the paren't isn't visibly, this component isn't either.
      if (!parentVisibility) {
        visible = parentVisibility;
      }
      else {
        visible = checkComponentVisibility(component);
      }

      // If there are columns, check all components and pass through nested visibility
      if (component.columns && Array.isArray(component.columns)) {
        component.columns.forEach(function(column) {
          checkVisibility(column.components, visible);
        });
      }

      // If there are rows, check all components and pass through nested visibility
      if (component.rows && Array.isArray(component.rows)) {
        [].concat.apply([], component.rows).forEach(function(row) {
          checkVisibility(row.components, visible);
        });
      }

      // If there are components, check all components and pass through nested visibility
      if (component.components && Array.isArray(component.components)) {
        checkVisibility(component.components, visible);
      }

      // Set this in the show variable.
      show[component.key] = visible;
    });
  };

  // Ensure this.form.components has a value.
  this.form = this.form || {};
  this.form.components = this.form.components || [];

  // Iterate over form components and checkVisibility()
  checkVisibility(this.form.components);

  // Toggle every conditional.
  var allHidden = Object.keys(show);
  (allHidden || []).forEach(function(componentKey) {
    // If a component is hidden, delete its value, so other conditionals are property chain reacted.
    if (!show[componentKey]) {
      return sweepSubmission();
    }
  });

  // Iterate each component we're supposed to show, if we find one we're not supposed to show, add it to the ignore.
  _.each(show, function(value, key) {
    try {
      // If this component isn't being displayed, don't require it.
      if (!boolean[value]) {
        this.ignore[key] = true;
      }
    }
    catch (e) {
      debug.error(e);
      debug.validator(e);
    }
  }.bind(this));
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

  // Using the submission, determine which fields are supposed to be shown; Only validate displayed fields.
  this.buildIgnoreList(submission);

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
          input: util.getValue(submission, component.key),
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

  // If an error has occurred in custom validation, fail immediately.
  debug.validator(error);
  if (error.length > 0) {
    var temp = {name: 'ValidationError', details: error};
    debug.validator('Errors were found.');
    return next(temp);
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
    else if (typeof data !== 'string' && data.hasOwnProperty('address_components') && data.hasOwnProperty('place_id')) {
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

    Joi.validate(submission.data, this.schema, {stripUnknown: true}, function(validateErr, value) {
      if (validateErr) {
        debug.validator(validateErr);
        return next(validateErr);
      }

      next(null, value);
    });
  }.bind(this));
};
/* eslint-enable max-statements */

module.exports = Validator;
