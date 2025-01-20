"use strict";

const util = require("../util/util");
const _ = require("lodash");
/**
 * Middleware function to filter bundle data based on form which selected in bundle.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function (router) {
  return function (req, res, next) {
    if (
      !res?.resource?.item ||
      !req.isBundle ||
      (req.isBundle && req.isAdmin && !req.token?.external) 
      /* Added an external check because in non-multi-tenant cases, 
      the designer token has admin permissions, making the token external.*/
    ) {
      return next();
    }

    const submissionModifiedData = {
      data: {
        applicationId: res.resource.item.data.applicationId,
        applicationStatus: res.resource.item.data.applicationStatus,
      },
    };

    util.eachComponent(req.bundledForm.components, (component, path) => {
      _.set(
        submissionModifiedData,
        `data.${path}`,
        _.get(res.resource.item, `data.${path}`)
      );
    });
    /* resource.item is whole submission data. so here spreading the all 
    keys inside the submission data like metedata and over rider the "data" key with submissionModifiedData */
    res.resource.item = { ...res.resource.item, ...submissionModifiedData };

    next();
  };
};
