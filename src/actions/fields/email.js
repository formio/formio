'use strict';

module.exports = (formio) => {
  const hook = require('../../util/hook')(formio);

  return async (component, data, handler, action, {validation, path, req, res}) => {
    // Only perform before validation has occurred.
    if (validation) {
      return;
    }
    const promise = {};
    promise.promise = new Promise((resolve, reject) => {
      promise.resolve = resolve;
      promise.reject = reject;
    });

    const result = await hook.invoke('validateEmail', component, path, req, res, (err) => {
      if (err) {
        promise.reject(err);
      }
      else {
        promise.resolve();
      }
    });

    if (!result) {
      promise.resolve();
    }

    return promise.promise;
  };
};
