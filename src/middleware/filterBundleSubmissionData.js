"use strict";

const util = require("../util/util");
const _ = require("lodash");
const AUTHORIZED_ROLE = process.env.AUTHORIZED_ROLE || "CUSTOM_ROLES";
/**
 * Middleware function to filter bundle data based on form which selected in bundle.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function (router) {
  return function (req, res, next) {
    const { customRoles = [] } = req.user;
    if (
      !res ||
      !res.resource ||
      !res.resource.item ||
      !req.isBundle ||
      (req.isBundle && customRoles.includes(AUTHORIZED_ROLE))
    ) {
      return next();
    }

    const submissionModifiedData = { data: {} };

    util.eachComponent(req.bundledForm.components, (component, path) => {
      _.set(
        submissionModifiedData,
        `data.${path}`,
        _.get(res.resource.item, `data.${path}`)
      );
    });

    res.resource.item = { ...res.resource.item, ...submissionModifiedData };

    res.resource.item = { ...res.resource.item, ...submissionModifiedData };
    next();
  };
};
