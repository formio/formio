'use strict';

const _ = require('lodash');
const util = require('../util/util');

// A filter key carries its operator after a '__' separator: 'data.ssn__regex'.
const QUERY_OPERATOR_SEPARATOR = '__';
// A sort field may carry a direction prefix: '?sort=-data.ssn'.
const SORT_DIRECTION_PREFIX = /^[-+]/;
// Sort fields are separated by commas or spaces, exactly as resourcejs splits them.
// A '+' prefix reaches us already decoded to a space.
const SORT_FIELD = /[^, ]+/g;
// Only submission data can carry a protected component.
const SUBMISSION_DATA_PREFIX = 'data.';

/**
 * Reject submission queries that filter or sort on a protected component.
 * Redaction hides the value in the response, but a filter is evaluated against
 * the raw stored document — a blind oracle over that value.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  return function(req, res, next) {
    // Admins holding the API key plus the raw-data-access hash can already see
    // protected values, so filtering on them reveals nothing new.
    if (router.formio.hook.alter('rawDataAccess', req, next, util.skipHookIfNotExists)) {
      return next();
    }

    // The path is everything before the first '__' — the same split resourcejs uses,
    // including the forms it treats as "no operator" ('data.ssn__').
    const filterPaths = Object.keys(req.query || {}).map((key) => {
      return key.split(QUERY_OPERATOR_SEPARATOR)[0];
    });
    // Sort order is an oracle of its own; '?sort=a&sort=b' and '?sort=a,b' both work.
    const sortValue = [].concat((req.query && req.query.sort) || []).join(',');
    const sortPaths = (sortValue.match(SORT_FIELD) || []).map((field) => {
      return field.replace(SORT_DIRECTION_PREFIX, '');
    });
    // A request naming no submission data needs no form at all. Loading one costs
    // a query per nesting level, including on every sub-request with an empty query.
    const dataPaths = filterPaths.concat(sortPaths).filter((path) => {
      return path.indexOf(SUBMISSION_DATA_PREFIX) === 0;
    });
    if (!dataPaths.length) {
      return next();
    }

    router.formio.cache.loadCurrentForm(req, (err, form) => {
      if (err) {
        return next(err);
      }
      // Nested protected paths appear only once sub-form schemas are spliced in.
      // Hydrate a copy so the cached form is left exactly as we found it.
      router.formio.cache.loadSubForms(_.cloneDeep(form), req, (loadErr, hydrated) => {
        if (loadErr) {
          return next(loadErr);
        }
        const offendingPath = util.findProtectedPath(hydrated.components, dataPaths);
        if (offendingPath) {
          return res.status(400).json(`Cannot filter or sort by protected field: ${offendingPath}`);
        }
        return next();
      });
    });
  };
};
