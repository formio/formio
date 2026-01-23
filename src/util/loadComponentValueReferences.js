'use strict';
const _ = require('lodash');
const util = require('./util');

module.exports = (router) => {
  // Get a subrequest and sub response for a nested request.
  const getSubRequest = function (component, subQuery, req, response) {
    const formId = component.form || component.resource || component.data.resource;
    const sub = {
      req: null,
      res: null,
    };

    // Here we will clone the request, and then change the request body
    // and parameters to make it seem like a separate request to get
    // the reference submission.
    sub.req = util.createSubRequest(req);
    if (!sub.req) {
      throw new Error('Too many recursive requests.');
    }
    sub.req.noResponse = true;
    sub.req.skipOwnerFilter = false;
    sub.req.formId = sub.req.params.formId = formId;
    sub.req.doNotMinify = true;

    // Make sure to change the submission id.
    if (subQuery && subQuery._id) {
      sub.req.subId = subQuery._id;
    } else {
      delete sub.req.subId;
    }

    //not allow to override subrequest subId with parent submissionId
    _.unset(sub.req.params, 'submissionId');

    sub.req.url = '/form/:formId/submission';
    sub.req.query = subQuery || {};
    sub.req.method = 'GET';
    sub.res = util.createSubResponse(response);
    return sub;
  };

  // Loads all sub-references.
  const loadReferences = function (component, query, req) {
    return new Promise((resolve, reject) => {
      let sub = {};
      const respond = function () {
        if (!sub.res.statusCode || sub.res.statusCode < 300 || sub.res.statusCode === 416) {
          return resolve(sub.res.resource ? sub.res.resource.item : []);
        } else {
          return reject(sub.res.statusMessage);
        }
      };
      try {
        sub = getSubRequest(component, query, req, respond);
      } catch (err) {
        return reject(err);
      }
      if (
        router.resourcejs.hasOwnProperty(sub.req.url) &&
        router.resourcejs[sub.req.url].hasOwnProperty('get')
      ) {
        router.resourcejs[sub.req.url].get.call(this, sub.req, sub.res, respond);
      } else {
        return reject('Unknown resource handler.');
      }
    });
  };

  return async (component, compValue, req) => {
    let idQuery = null;
    if (!compValue) {
      return Promise.resolve([]);
    }

    if (component.multiple && _.isArray(compValue)) {
      idQuery = {
        $in: []
      };
      _.map(compValue, (val) => idQuery.$in.push(util.ObjectId(val._id)));
    } else if (compValue._id) {
      idQuery = util.ObjectId(compValue._id);
    }

    if (!idQuery) {
      return Promise.resolve();
    }
    return loadReferences(
      component, {
        _id: idQuery,
        limit: 10000000,
      },
      req,
    );
  };
};