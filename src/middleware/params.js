'use strict';

const _ = require('lodash');

const util = require('../util/util');

module.exports = (router) => {
  const hook = require('../util/hook')(router.formio);

  return (req, res, next) => {
    // Split the request url into its corresponding parameters.
    const params = _.assign(util.getUrlParams(req.url), util.getUrlParams(req.baseUrl));

    if (params.hasOwnProperty('form') && util.checkIsUndefinedOrNullString(params.form)) {
      return res.status(400).send('Invalid form id provided.');
    }

    // Get the formId from the request url.
    const formId = params.form ?? null;

    if (params.hasOwnProperty('submission') && util.checkIsUndefinedOrNullString(params.submission)) {
      return res.status(400).send('Invalid submission id provided.');
    }

    // Get the subId from the request url.
    let subId = params.submission ?? null;

    if (params.hasOwnProperty('role') && util.checkIsUndefinedOrNullString(params.role)) {
      return res.status(400).send('Invalid role id provided.');
    }

    // Get the roleId from the request url.
    const roleId = params.role ?? null;

    // FA-993 - Update the request to check submission index in the case of submission exports.
    if (subId === null && formId !== null && params.hasOwnProperty('export')) {
      subId = '';
    }

    // Attach the known id's to the request for other middleware.
    req.formId = formId;
    req.subId = subId;
    req.roleId = roleId;
    hook.alter('requestParams', req, params);

    next();
  };
};
