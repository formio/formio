'use strict';
const fs = require('fs');
const path = require('path');
const {DefaultEvaluator} = require('@formio/core');
const {IsolateVM} = require('@formio/vm');
const {isObject, get} = require('lodash');

const CORE_LODASH_MOMENT_INPUTMASK = fs.readFileSync(
  path.resolve(__dirname, 'bundles/core-lodash-moment-inputmask.js'),
  'utf8'
);

const CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS = fs.readFileSync(
  path.resolve(__dirname, 'bundles/core-lodash-moment-inputmask-nunjucks.js'),
  'utf-8'
);

class IsolateVMEvaluator extends DefaultEvaluator {
  constructor(options) {
    super(options);
    this.vm = new IsolateVM({env: CORE_LODASH_MOMENT_INPUTMASK});
  }

  evaluate(func, args, ret, interpolate, context, options) {
    options = isObject(options) ? options : {noeval: options};
    const component = args.component ? args.component : {key: 'unknown'};
    if (!args.form && args.instance) {
      args.form = get(args.instance, 'root._form', {});
    }
    const componentKey = component.key;
    if (typeof func === 'object') {
      return super.evaluate(func, args, ret, interpolate, context, options);
    }
    else if (typeof func === 'string') {
      if (ret) {
        func = `var ${ret};${func};${ret}`;
      }

      if (interpolate) {
        func = this.interpolate(func, args, {...options, noeval: true});
      }

      try {
        if (this.noeval || options.noeval) {
          console.warn('No evaluations allowed for this renderer.');
          return null;
        }
        else {
          return this.vm.evaluateSync(
            func,
            args,
            {
              modifyEnv: options.formModule ?
              `const module = ${options.formModule};
              if (module.options?.form?.evalContext) {
                const evalContext = module.options.form.evalContext;
                Object.keys(evalContext).forEach((key) => globalThis[key] = evalContext[key]);
              }`
              : undefined
            }
          );
        }
      }
      catch (err) {
        // Timeout errors should cause the request to fail
        if (err.message.includes('Script execution timed out')) {
          throw err;
        }
        console.warn(`An error occured within the custom function for ${componentKey}`, err);
        return null;
      }
    }
  }
}

module.exports = {
  IsolateVMEvaluator,
  CORE_LODASH_MOMENT_INPUTMASK,
  CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS
};
