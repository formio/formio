'use strict';

module.exports = (input, done) => {
  let clone = require('clone');
  let nunjucks = require('nunjucks');
  let dateFilter = require('nunjucks-date-filter');
  let _ = require('lodash');
  let debug = {
    nunjucks: require('debug')('formio:util:nunjucks'),
    error: require('debug')('formio:error')
  };
  let util = require('./util');

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

//  // Script to render a single string.
//  let script = `
//  environment.params = clone(context);
//  if (context._private) {
//    delete context._private;
//  }
//  output = environment.renderString(input, context);
//`;
//
//  // Script to render an object of properties.
//  var objScript = `
//  environment.params = clone(context);
//  if (context._private) {
//    delete context._private;
//  }
//  context._rendered = {};
//  for (var prop in input) {
//    if (input.hasOwnProperty(prop)) {
//      context._rendered[prop] = output[prop] = environment.renderString(input[prop], context);
//    }
//  }
//`;

  let template = input.template;
  let context = input.context;

  let vm = require('vm');
  let vmCode = new vm.Script(getScript(template));
  let vmContext = new vm.createContext(context);
  vmCode.runInContext(vmContext, { timeout: 15000 });

  return done(null, context);
};

//var clone = require('clone');
//var nunjucks = require('nunjucks');
//var dateFilter = require('nunjucks-date-filter');
//var _ = require('lodash');
//var debug = {
//  nunjucks: require('debug')('formio:util:nunjucks'),
//  error: require('debug')('formio:error')
//};
//var util = require('./util');
//let Worker = require('../worker/index');
//
//// Configure nunjucks to not watch any files
//let environment = nunjucks.configure([], {
//  watch: false,
//  autoescape: false
//});
//
//environment.addFilter('is_string', function(obj) {
//  return _.isString(obj);
//});
//
//environment.addFilter('is_array', function(obj) {
//  return _.isArray(obj);
//});
//
//environment.addFilter('is_object', function(obj) {
//  return _.isPlainObject(obj);
//});
//
//environment.addFilter('date', dateFilter);
//
//environment.addFilter('submissionTable', function(obj, components) {
//  return new nunjucks.runtime.SafeString(util.renderFormSubmission(obj, components));
//});
//
//environment.addFilter('componentValue', function(obj, key, components) {
//  var compValue = util.renderComponentValue(obj, key, components);
//  return new nunjucks.runtime.SafeString(compValue.value);
//});
//
//environment.addFilter('componentLabel', function(key, components) {
//  var label = key;
//  if (!components.hasOwnProperty(key)) {
//    return label;
//  }
//  var component = components[key];
//  label = component.label || component.placeholder || component.key;
//  return label;
//});
//
//// Script to render a single string.
//let script = `
//  environment.params = clone(context);
//  if (context._private) {
//    delete context._private;
//  }
//  output = environment.renderString(input, context);
//`;
//
//// Script to render an object of properties.
//var objScript = `
//  environment.params = clone(context);
//  if (context._private) {
//    delete context._private;
//  }
//  context._rendered = {};
//  for (var prop in input) {
//    if (input.hasOwnProperty(prop)) {
//      context._rendered[prop] = output[prop] = environment.renderString(input[prop], context);
//    }
//  }
//`;
//
//module.exports = {
//  environment,
//  render: (string, context) => new Promise((resolve, reject) => {
//    try {
//      let sandbox = {
//        output: '',
//        input: string,
//        environment,
//        context
//      };
//
//      (new Worker(script, sandbox, ['clone'], 10000)).thread.promise()
//        .then(response => {
//          console.log('response')
//          console.log(response)
//          return resolve(response)
//        })
//        .catch(reject)
//    }
//    catch (e) {
//      debug.nunjucks(e);
//      debug.error(e);
//      return reject(e.name + ': ' + e.message);
//    }
//  }),
//  renderObj: (obj, context) => new Promise((resolve, reject) => {
//    try {
//      let sandbox = {
//        output: {},
//        input: obj,
//        environment: environment,
//        context: context
//      };
//
//      let worker = new Worker(objScript, sandbox, ['clone'], 10000, (err, ctx) => {
//        if (err) {
//          return reject(err);
//        }
//
//        return resolve(ctx);
//      });
//    }
//    catch (e) {
//      debug.nunjucks(e);
//      debug.error(e);
//      return reject(e.name + ': ' + e.message);
//    }
//  })
//};

