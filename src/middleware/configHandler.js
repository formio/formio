'use strict';
const {createFilteredLogger} = require('@formio/logger');
const debug = createFilteredLogger('formio:config');
const _ = require('lodash');

/**
 * The Config handler returns the project's public configuration.
 *
 * @param router
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  const formio = hook.alter('formio', router.formio);
  const config = {};

  if (_.isPlainObject(formio.config.public)) {
    _.forOwn(formio.config.public, (value, key) => {
      config[key] = value;
    });
  }

  // Allow the PUBLIC_CONFIG variable define or overwrite the default public configuration.
  if (process.env.PUBLIC_CONFIG) {
    try {
      _.forOwn(JSON.parse(process.env.PUBLIC_CONFIG), (value, key) => {
        config[key] = value;
      });
    }
    catch (err) {
      debug.error('Failed to parse public configuration.', err);
    }
  }

  return function configHandler(req, res, next) {
    return res.json({config});
  };
};
