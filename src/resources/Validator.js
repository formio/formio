'use strict';

const vm = require('vm');
const _ = require('lodash');
const debug = {
  validator: require('debug')('formio:validator'),
  error: require('debug')('formio:error')
};

// Define a few global noop placeholder shims and import the component classes
global.Text              = class {};
global.HTMLElement       = class {};
global.HTMLCanvasElement = class {};
global.navigator         = {userAgent: ''};
global.document          = {createElement: () => ({}), cookie: '', getElementsByTagName: () => []};
global.window            = {addEventListener: () => {}, Event: {}, navigator: global.navigator};

const Evaluator = require('formiojs/utils/Evaluator.js').default;
Evaluator.evaluator = function(func, args) {
  return function() {
    const params = _.keys(args);
    const sandbox = vm.createContext({
      result: null,
      args
    });
    /* eslint-disable no-empty */
    try {
      const script = new vm.Script(`result = (function({${params.join(',')}}) {${func}})(args);`);
      script.runInContext(sandbox, {
        timeout: 250
      });
    }
    catch (err) {}
    /* eslint-enable no-empty */
    return sandbox.result;
  };
};

const {Displays, Formio} = require('formiojs/formio.form.js');

// Remove onChange events from all displays.
_.each(Displays.displays, (display) => {
  display.prototype.onChange = _.noop;
});

/**
 * @TODO: Isomorphic validation system.
 *
 * @param form
 * @param model
 * @constructor
 */
class Validator {
  constructor(form, model, token) {
    this.model = model;
    this.form = form;
    this.token = token;
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

    const unsets = [];
    let unsetsEnabled = false;

    // Create the form, then check validity.
    Formio.createForm(this.form, {
      hooks: {
        setDataValue: function(value, key, data) {
          if (!unsetsEnabled) {
            return value;
          }
          // Check if this component is not persistent.
          if (this.component.hasOwnProperty('persistent') &&
            (!this.component.persistent || this.component.persistent === 'client-only')
          ) {
            unsets.push({key, data});
          }
          // Check if this component is conditionally hidden and does not set clearOnHide to false.
          else if (
            (!this.component.hasOwnProperty('clearOnHide') || this.component.clearOnHide) &&
            (!this.conditionallyVisible() || !this.parentVisible)
          ) {
            unsets.push({key, data});
          }
          return value;
        }
      }
    }).then((form) => {
      // Set the validation config.
      form.validator.config = {
        db: this.model,
        token: this.token,
        form: this.form,
        submission: submission
      };

      // Set the submission data
      form.data = submission.data;

      // Perform calculations and conditions.
      form.calculateValue();
      form.checkConditions();

      // Reset the data
      form.data = {};

      // Set the value to the submission.
      unsetsEnabled = true;
      form.setValue(submission, {
        sanitize: true
      });

      // Check the validity of the form.
      form.checkAsyncValidity(null, true).then((valid) => {
        if (valid) {
          // Clear the non-persistent fields.
          unsets.forEach((unset) => _.unset(unset.data, unset.key));
          submission.data = form.data;
          return next(null, submission.data);
        }

        const details = [];
        form.errors.forEach((error) => error.messages.forEach((message) => details.push(message)));

        // Return the validation errors.
        return next({
          name: 'ValidationError',
          details: details
        });
      }).catch(next);
    }).catch(next);
  }
}

module.exports = Validator;
