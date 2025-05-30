'use strict';

module.exports = (formio) => {
  const hook = require('../../util/hook')(formio);

  return async (component, data, handler, action, {validation, path, req, res}) => {
    // Only perform before validation has occurred.
    if (validation) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!hook.invoke('validateEmail', component, path, req, res, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      })) {
        return resolve();
      }
    });
  };
};
