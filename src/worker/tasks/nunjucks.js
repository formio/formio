'use strict';

module.exports = (worker, done) => {
  let clone = require('clone');
  let nunjucks = require('nunjucks');
  let dateFilter = require('nunjucks-date-filter');
  let _ = require('lodash');
  let debug = {
    nunjucks: require('debug')('formio:util:nunjucks'),
    error: require('debug')('formio:error')
  };
  let util = require('../../util/util');

  // Configure nunjucks to not watch any files
  let environment = nunjucks.configure([], {
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

  let filters = worker.filters || {};
  Object.keys(filters).forEach(filter => {
    environment.addFilter(filter, filters[filter]);
  });

  let getScript = (data) => {
    if (typeof data === 'string') {
      // Script to render a single string.
      return `
        environment.params = clone(context);
        if (context._private) {
          delete context._private;
        }
        output = environment.renderString(input, context);
      `;
    }

    // Script to render an object of properties.
    return `
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
  };

  let input = worker.input;
  let context = worker.context || {};
  let sandbox = {
    clone,
    environment,
    input,
    context
  };

  let vm = require('vm');
  let vmCode = new vm.Script(getScript(input));
  let vmContext = new vm.createContext(sandbox);
  vmCode.runInContext(vmContext, { timeout: 15000 });

  return done(context);
};
