'use strict';
const _ = require('lodash');
const {Formio} = require('../util/util');
const debug = {
  validator: require('debug')('formio:validator'),
  error: require('debug')('formio:error')
};

/**
 * @TODO: Isomorphic validation system.
 *
 * @param form
 * @param model
 * @constructor
 */
class Validator {
  constructor(form, model, token, decodedToken, hook) {
    this.model = model;
    this.form = form;
    this.token = token;
    this.hook = hook;

    const self = this;
    const evalContext = Formio.Components.components.component.prototype.evalContext;
    Formio.Components.components.component.prototype.evalContext = function(additional) {
      return evalContext.call(this, self.evalContext(additional));
    };

    // Change Formio.getToken to return the server decoded token.
    const getToken = Formio.getToken;
    Formio.getToken = (options) => {
      return options.decode ? decodedToken : getToken(options);
    };
  }

  evalContext(context) {
    context = context || {};
    context.form = this.form;
    return this.hook.alter('evalContext', context, this.form);
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
      return next();
    }

    const unsets = [];
    const conditionallyInvisibleComponents = [];
    const emptyData = _.isEmpty(submission.data);
    let unsetsEnabled = false;

    const {validateReCaptcha} = this;

    try {
      // Create the form, then check validity.
      Formio.createForm(this.form, {
        server: true,
        noDefaults: true,
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
              conditionallyInvisibleComponents.push({component: this, key, data});
            }
            else if (
              this.component.type === 'password' && value === this.defaultValue
            ) {
              unsets.push({key, data});
            }
            return value;
          },
          validateReCaptcha(responseToken) {
            if (validateReCaptcha) {
              return validateReCaptcha(responseToken);
            }

            return true;
          },
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

        // Reset the data
        form.data = {};

        form.setValue(submission, {
          sanitize: form.allowAllSubmissionData ? false : true,
        });

        // Perform calculations and conditions.
        form.checkConditions();
        form.clearOnHide();
        form.calculateValue();

        // Set the value to the submission.
        unsetsEnabled = true;

        // Check the visibility of conditionally visible components after unconditionally visible
        _.forEach(conditionallyInvisibleComponents, ({component, key, data}) => {
          if (!component.conditionallyVisible() || !component.parentVisible) {
            unsets.push({key, data});
          }
        });

        // Check the validity of the form.
        form.checkAsyncValidity(null, true).then((valid) => {
          if (valid) {
            // Clear the non-persistent fields.
            unsets.forEach((unset) => _.unset(unset.data, unset.key));
            if (form.form.display === 'wizard' && (form.prefixComps.length || form.suffixComps.length)) {
              submission.data = emptyData ? {} : {...submission.data, ...form.data};
            }
            else {
              submission.data = emptyData ? {} : form.data;
            }
            const visibleComponents = (form.getComponents() || []).map(comp => comp.component);
            return next(null, submission.data, visibleComponents);
          }

          if (form.form.display === 'wizard') {
            // Wizard errors object contains all wizard errors only on last page
            form.page = form.pages.length - 1;
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
    catch (err) {
      return next(err);
    }
  }
}

module.exports = Validator;
