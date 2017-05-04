'use strict';

var util = require('../util/util');
var _ = require('lodash');
var debug = require('debug')('formio:request');

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  return function paramsHandler(req, res, next) {
    // Split the request url into its corresponding parameters.
    var params = _.assign(util.getUrlParams(req.url), util.getUrlParams(req.baseUrl));

    // Get the formId from the request url.
    var formId = params.hasOwnProperty('form') && params.form !== 'undefined'
      ? params.form
      : null;

    // Get the formId from the request url.
    var subId = params.hasOwnProperty('submission') && params.form !== 'undefined'
      ? params.submission
      : null;

    // Get the roleId from the request url.
    var roleId = params.hasOwnProperty('role') && params.role !== 'undefined'
      ? params.role
      : null;

    // FA-993 - Update the request to check submission index in the case of submission exports.
    if (subId === null && formId !== null && params.hasOwnProperty('export')) {
      subId = '';
    }

    // Attach the known id's to the request for other middleware.
    req.formId = formId;
    req.subId = subId;
    req.roleId = roleId;
    hook.alter('requestParams', req, params);
    debug(params);

    next();
  };
};
