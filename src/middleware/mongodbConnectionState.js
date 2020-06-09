'use strict';

/**
 * The mongodbConnectionState middleware.
 *
 * This middleware is used for checking mongodb connection state.
 *
 * @param router
 * @returns {Function}
 */
module.exports = (router) => (formio) => function(req, res, next) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  if (!formio.mongoose || !formio.mongoose.connection) {
    req.mongodbConnectionState = 'connection doesn\'t exist';
    return next();
  }
  const mongodbState = formio.mongoose.connection.readyState;
  req.mongodbConnectionState = states[mongodbState] || 'unresolved';
  return next();
};
