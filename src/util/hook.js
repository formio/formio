'use strict';

module.exports = function(formio) {
  return {
    async settings(req) {
      const settings = (formio.config && formio.config.settings) || {};
      if (formio.hooks && formio.hooks.settings) {
        return await formio.hooks.settings(settings, req);
      }

      // Load the settings directly.
      return settings;
    },
    invoke() {
      const name = arguments[0];
      if (
        formio.hooks &&
        formio.hooks.on &&
        formio.hooks.on[name]
      ) {
        const retVal = formio.hooks.on[name].apply(formio.hooks.on, Array.prototype.slice.call(arguments, 1));
        return (retVal !== undefined) ? !!retVal : true;
      }
      return false;
    },
    alter() {
      const name = arguments[0];
      const fn = (typeof arguments[arguments.length - 1] === 'function') ? arguments[arguments.length - 1] : null;
      if (
        formio.hooks &&
        formio.hooks.alter &&
        formio.hooks.alter[name]
      ) {
        return formio.hooks.alter[name].apply(formio.hooks.alter, Array.prototype.slice.call(arguments, 1));
      }
      else {
        // If this is an async hook instead of a sync.
        if (fn) {
          return fn(null, arguments[1]);
        }
        else {
          return arguments[1];
        }
      }
    }
  };
};
