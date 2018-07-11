'use strict';

module.exports = function(router) {
  return {
    reference: require('./reference')(router)
  };
};
