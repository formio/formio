'use strict';

module.exports = (worker, done) => {
  let vm = require('vm');
  let clone = require('clone');
  let nunjucks = require('nunjucks');
  let dateFilter = require('nunjucks-date-filter');
  let _ = require('lodash');
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
    try {
      // Essentially eval, but it only gets executed in a vm within a child process.
      environment.addFilter(filter, new Function(`return ${filters[filter].toString()}`)());
    }
    catch (e) {
      // TODO: Add user logs to fix issues with email templates.
      /* eslint-disable no-console */
      console.log(e);
      /* eslint-enable no-console */
    }
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
          context._rendered[prop] = output[prop] = environment.renderString(
            environment.renderString(input[prop], context),
            context
          );
        }
      }
    `;
  };

  let render = worker.render;
  let context = worker.context || {};

  // Convert all toString functions back to functions.
  let functions = worker._functions || [];
  functions.forEach(key => {
    context[key] = new Function(`return ${context[key].toString()}`)();
  });

  // Build the sandbox context with our dependencies
  let sandbox = {
    clone,
    environment,
    input: render,
    context,
    output: (typeof render === 'string' ? '' : {})
  };

  let script = new vm.Script(getScript(render));
  try {
    script.runInContext(vm.createContext(sandbox), {timeout: 15000});
  }
  catch (e) {
    /* eslint-disable no-console */
    console.log(e.message);
    console.log(e.stack);
    /* eslint-enable no-console */
    return done({resolve: null});
  }

  return done({resolve: sandbox.output});
};
