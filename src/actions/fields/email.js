'use strict';

module.exports = (formio) => {
  const hook = require('../../util/hook')(formio);

  return async (component, data, handler, action, {validation, path, req, res}) => {
    // Only perform before validation has occurred.
    if (validation) {
      return;
    }

    return await hook.invoke('validateEmail', component, path, req, res);
  };
};
