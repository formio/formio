'use strict';

module.exports = function (formio) {
  // The handler registered for a fire-and-forget `on` event, or undefined when nothing is
  // listening.
  const implementationOf = (event) => {
    const implementation = formio.hooks && formio.hooks.on && formio.hooks.on[event];
    return typeof implementation === 'function' ? implementation : undefined;
  };

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
      if (formio.hooks && formio.hooks.on && formio.hooks.on[name]) {
        const retVal = formio.hooks.on[name].apply(
          formio.hooks.on,
          Array.prototype.slice.call(arguments, 1),
        );
        return retVal !== undefined ? !!retVal : true;
      }
      return false;
    },
    /**
     * Offers a function to the consumer's instrumentation, and returns what to call in its place.
     *
     * With nothing registered this returns `fn` itself — the identity default IS the contract, not
     * a missing implementation, and "fixing" it would disable every consumer's instrumentation with
     * no signal. GOTCHA(G-FOS07)
     *
     * Named parameters rather than `invoke`/`alter`'s `arguments` style: `alter` treats a trailing
     * function argument as an async callback, which would *call* the stage instead of wrapping it.
     *
     * @param {String} name - the stage being instrumented, for the implementation to label with.
     * @param {Function} fn - the function to instrument.
     * @returns {Function} `fn`, or the implementation's wrapper around it.
     */
    instrument(name, fn) {
      if (formio.hooks && typeof formio.hooks.instrument === 'function') {
        return formio.hooks.instrument(fn, name);
      }
      return fn;
    },
    /**
     * Reports a measurement to a fire-and-forget `on` event, building the arguments only if
     * something is registered to receive them.
     *
     * `buildArgs` is a callback rather than plain arguments because a reported value can cost real
     * work — the component-count measurement walks the whole component tree — and a server with no
     * implementation registered, which is every OSS server, must not pay to compute a measurement
     * nobody collects.
     *
     * Nothing here may reach the caller: reporting is fire-and-forget, and a measurement that
     * failed is not worth failing the request that produced it.
     *
     * GOTCHA(G-FOS08)
     *
     * @param {String} event - the `on` event to report to.
     * @param {Function} buildArgs - returns the array of arguments to report.
     */
    report(event, buildArgs) {
      const implementation = implementationOf(event);
      if (!implementation) {
        return;
      }
      try {
        implementation.apply(formio.hooks.on, buildArgs());
      } catch {
        // Fire-and-forget.
      }
    },
    // GOTCHA(G-FOS01)
    alter() {
      const name = arguments[0];
      const fn =
        typeof arguments[arguments.length - 1] === 'function'
          ? arguments[arguments.length - 1]
          : null;
      if (formio.hooks && formio.hooks.alter && formio.hooks.alter[name]) {
        return formio.hooks.alter[name].apply(
          formio.hooks.alter,
          Array.prototype.slice.call(arguments, 1),
        );
      } else {
        // If this is an async hook instead of a sync.
        if (fn) {
          return fn(null, arguments[1]);
        } else {
          return arguments[1];
        }
      }
    },
  };
};
