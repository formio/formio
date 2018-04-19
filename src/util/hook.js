'use strict';

module.exports = function(formio) {
  return {
    settings(req, cb) {
      const settings = (formio.config && formio.config.settings) || {};
      if (formio.hooks && formio.hooks.settings) {
        return formio.hooks.settings(settings, req, cb);
      }

      // Load the settings directly.
      cb(null, settings);
    },
    invoke(name, ...args) {
      if (
        formio.hooks &&
        formio.hooks.on &&
        formio.hooks.on[name]
      ) {
        const retVal = formio.hooks.on[name].apply(formio.hooks.on, args);
        return (retVal !== undefined) ? Boolean(retVal) : true;
      }
      return false;
    },
    alter(name, ...args) {
      const fn = (typeof args[args.length - 1] === 'function') ? args[args.length - 1] : null;
      if (
        formio.hooks &&
        formio.hooks.alter &&
        formio.hooks.alter[name]
      ) {
        return formio.hooks.alter[name].apply(formio.hooks.alter, args);
      }
      else {
        // If this is an async hook instead of a sync.
        if (fn) {
          return fn(null, args[0]);
        }
        else {
          return args[0];
        }
      }
    }
  };
};
