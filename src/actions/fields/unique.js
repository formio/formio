'use strict';

var _ = require('lodash');

module.exports = function(formio) {
  var hook = require('../../util/hook')(formio);
  var util = formio.util;

  return {
    beforePut: function(component, req, res, next) {
      return next();
    },

    beforePost: function(component, req, res, next) {
      return next();
    }
  };
};
