'use strict';

var _ = require('lodash');
var util = require('../util/util');

module.exports = {
  /**
   * Declare all of our modules.
   */
  modules: {
    apibind: require('./apibind')
  },

  /**
   * Load all modules.
   *
   * @param router
   * @param server
   */
  load: function(router, server) {
    _.each(this.modules, function(module, name) {
      util.log('Loading module ' + name);
      module.load(router, server);
    });
  }
};
