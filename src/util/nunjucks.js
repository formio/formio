'use strict';

var clone = require('clone');
var vm = require('vm');
var nunjucks = require('nunjucks');
var dateFilter = require('nunjucks-date-filter');
var _ = require('lodash');
var debug = {
  nunjucks: require('debug')('formio:util:nunjucks'),
  error: require('debug')('formio:error')
};
var util = require('./util');
let Worker = require('../worker/index');

// Configure nunjucks to not watch any files
var environment = nunjucks.configure([], {
  watch: false,
  autoescape: false
});

environment.addFilter('is_string', function(obj) {
  return _.isString(obj);
});

environment.addFilter('is_array', function(obj) {
  return _.isArray(obj);
});

environment.addFilter('is_object', function(obj) {
  return _.isPlainObject(obj);
});

environment.addFilter('date', dateFilter);

environment.addFilter('submissionTable', function(obj, components) {
  return new nunjucks.runtime.SafeString(util.renderFormSubmission(obj, components));
});

environment.addFilter('componentValue', function(obj, key, components) {
  var compValue = util.renderComponentValue(obj, key, components);
  return new nunjucks.runtime.SafeString(compValue.value);
});

environment.addFilter('componentLabel', function(key, components) {
  var label = key;
  if (!components.hasOwnProperty(key)) {
    return label;
  }
  var component = components[key];
  label = component.label || component.placeholder || component.key;
  return label;
});

// Script to render a single string.
let script = `
  environment.params = clone(context);
  if (context._private) {
    delete context._private;
  }
  output = environment.renderString(input, context);
`;

// Script to render an object of properties.
var objScript = `
  environment.params = clone(context);
  if (context._private) {
    delete context._private;
  }
  context._rendered = {};
  for (var prop in input) {
    if (input.hasOwnProperty(prop)) {
      context._rendered[prop] = output[prop] = environment.renderString(input[prop], context);
    }
  }
`;

module.exports = {
  environment: environment,
  render: function(string, context) {
    return Promise((resolve, reject) => {
      try {
        let sandbox = {
          output: '',
          input: string,
          clone: clone,
          environment: environment,
          context: context
        };

        let worker = new Worker(script, sandbox, 10000, (err, ctx) => {
          if (err) {
            return reject(err);
          }

          return resolve(ctx.output);
        });
      }
      catch (e) {
        debug.nunjucks(e);
        debug.error(e);
        return reject(e.name + ': ' + e.message);
      }
    });
  },
  renderObj: function(obj, context) {
    return Promise((resolve, reject) => {
      try {
        let sandbox = {
          output: {},
          input: obj,
          clone: clone,
          environment: environment,
          context: context
        };

        let worker = new Worker(objScript, sandbox, 10000, (err, ctx) => {
          if (err) {
            return reject(err);
          }

          return resolve(ctx.output);
        });
      }
      catch (e) {
        debug.nunjucks(e);
        debug.error(e);
        return reject(e.name + ': ' + e.message);
      }
    });
  }
};
