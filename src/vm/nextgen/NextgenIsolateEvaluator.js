'use strict';
const fs = require('fs');
const path = require('path');
const { DefaultEvaluator } = require('@formio/nextgen');
const { IsolateVM } = require('@formio/vm');
const { isObject } = require('lodash');

const NEXTGEN_EVALUATOR_BUNDLE = fs.readFileSync(
  path.resolve(__dirname, '../bundles/nextgen-evaluator.js'),
  'utf8',
);

class NextgenIsolateEvaluator extends DefaultEvaluator {
  constructor(options, hook) {
    super(options);
    const vmOptions = { env: NEXTGEN_EVALUATOR_BUNDLE };
    if (options?.memoryLimitMb) {
      vmOptions.memoryLimitMb = options.memoryLimitMb;
    }
    if (options?.timeoutMs) {
      vmOptions.timeoutMs = options.timeoutMs;
    }
    this.vm = new IsolateVM(vmOptions);
    this.hook = hook;
  }

  evaluate(func, args, ret, interpolate, context, options) {
    options = isObject(options) ? options : { noeval: options };
    if (typeof func === 'object') {
      return super.evaluate(func, args, ret, interpolate, context, options);
    }
    if (typeof func === 'string') {
      const hasLiveInstance = args && (args.instance || args.self);
      if (hasLiveInstance) {
        throw new Error(
          'Cannot evaluate an expression bound to a live instance on the host; instance-bearing evaluation must run inside the render.',
        );
      }
      if (ret) {
        func = `var ${ret};${func};${ret}`;
      }
      try {
        if (this.noeval || options.noeval) {
          return null;
        }
        return this.vm.evaluateSync(func, args, {});
      } catch (err) {
        if (err.message.includes('Script execution timed out')) {
          throw err;
        }
        return null;
      }
    }
  }
}

module.exports = { NextgenIsolateEvaluator };
