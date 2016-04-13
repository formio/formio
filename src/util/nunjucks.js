var clone = require('clone');
var vm = require('vm');
var util = require('util');
var nunjucks = require('nunjucks');

// Configure nunjucks to not watch any files
var environment = nunjucks.configure([], {
  watch: false
});

// Script to render a single string.
var script = new vm.Script(
  'environment.params = clone(context);' +
  'if (context._private) { delete context._private; }' +
  'output = environment.renderString(input, context);'
);

// Script to render an object of properties.
var objScript = new vm.Script(
  'environment.params = clone(context);' +
  'if (context._private) {' +
    'delete context._private;' +
  '}' +
  'context._rendered = {};' +
  'for (var prop in input) {' +
    'if (input.hasOwnProperty(prop)) {' +
      'context._rendered[prop] = output[prop] = environment.renderString(input[prop], context);' +
    '}' +
  '}'
);

module.exports = {
  environment: environment,
  render: function(string, context) {
    var rendered = '';
    try {
      var sandbox = {
        output: '',
        input: string,
        clone: clone,
        environment: environment,
        context: context
      };
      var context = new vm.createContext(sandbox);
      script.runInContext(context, {
        timeout: 500
      });
      rendered = sandbox.output;
    }
    catch (e) {
      rendered = e.message;
    }
    return rendered;
  },
  renderObj: function(obj, context) {
    var rendered = '';
    try {
      var sandbox = {
        output: {},
        input: obj,
        clone: clone,
        environment: environment,
        context: context
      };
      var context = new vm.createContext(sandbox);
      objScript.runInContext(context, {
        timeout: 500
      });
      rendered = sandbox.output;
    }
    catch (e) {
      rendered = e.message;
    }
    return rendered;
  },
};
