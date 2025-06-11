'use strict';
const fs = require('fs');
const path = require('path');
const {DefaultEvaluator} = require('@formio/core');
const {IsolateVM} = require('@formio/vm');
const {isObject, get} = require('lodash');
const {RootShim} = require('./src/RootShim');

const CORE_LODASH_MOMENT_INPUTMASK = fs.readFileSync(
  path.resolve(__dirname, 'bundles/core-lodash-moment-inputmask.js'),
  'utf8'
);
const CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS = fs.readFileSync(
  path.resolve(__dirname, 'bundles/core-lodash-moment-inputmask-nunjucks.js'),
  'utf-8'
);

class IsolateVMEvaluator extends DefaultEvaluator {
  /**
   * Create a new IsolateVMEvaluator instance
   * @param {import('@formio/core').EvaluatorOptions} options - Evaluator options
   * @param {*} hook - The Form.io hook system (needed for Enterprise features)
   */
  constructor(options, hook) {
    super(options);
    this.vm = new IsolateVM({env: CORE_LODASH_MOMENT_INPUTMASK});
    this.hook = hook;
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

      // We have to compile the InstanceShims as a part of evaluation, since they contain functions and setters & getters (@formio/vm
      // uses the structured clone algorithm to serialize into the sandbox, which means no functions and no setters/getters). To do this,
      // we filter out the instance variable that might be in the context and compile it is a part of the sandboxes' `env`
      let filteredArgs = args;
      let modifyEnv = '';
      if (args.instance) {
        const {instance, ...rest} = args;
        filteredArgs = rest;
        modifyEnv = `
          const root = new RootShim(form, submission, scope);
          const instances = root.instanceMap;
          const instance = instances[component.modelType === 'none' && paths?.fullPath ? paths.fullPath : path];
        `;
      }

      // Update the env to account for form modules
      if (options.formModule) {
        modifyEnv += `
          const module = ${options.formModule};
          if (module.options?.form?.evalContext) {
            const evalContext = module.options.form.evalContext;
            Object.keys(evalContext).forEach((key) => globalThis[key] = evalContext[key]);
          }
        `;
      }

      modifyEnv = this.hook.alter('dynamicVmDependencies', modifyEnv, context?.form);

      try {
        if (this.noeval || options.noeval) {
          console.warn('No evaluations allowed for this renderer.');
          return null;
        }
        else {
          return this.vm.evaluateSync(
            func,
            filteredArgs,
            {
              modifyEnv,
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
  RootShim,
  CORE_LODASH_MOMENT_INPUTMASK,
  CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS
};
