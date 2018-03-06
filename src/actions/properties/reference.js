'use strict';
const FormioUtils = require('formiojs/utils');
const _ = require('lodash');
const util = require('../../util/util');
const async = require('async');

module.exports = router => {
  const hiddenFields = ['deleted', '__v', 'machineName'];

  // Get a subrequest and sub response for a nested request.
  const getSubRequest = function(component, query, req, res, response) {
    const formId = component.form || component.resource || component.data.resource;
    const sub = {
      req: null,
      res: null
    };

    // Here we will clone the request, and then change the request body
    // and parameters to make it seem like a separate request to get
    // the reference submission.
    sub.req = util.createSubRequest(req);
    if (!sub.req) {
      return Promise.reject('Too many recursive requests.');
    }
    sub.req.noResponse = true;
    sub.req.skipOwnerFilter = false;
    sub.req.formId = sub.req.params.formId = formId;
    if (query._id) {
      sub.req.subId = sub.req.params.submissionId = query._id;
    }

    sub.req.url = '/form/:formId/submission';
    sub.req.query = query;
    sub.req.method = 'GET';
    sub.res = util.createSubResponse(response);
    return sub;
  };

  // Checks access within a form index.
  const checkAccess = function(component, query, req, res) {
    return new Promise((resolve, reject) => {
      let sub = {};
      const respond = function() {
        if (!sub.res.statusCode || sub.res.statusCode < 300 || sub.res.statusCode === 416) {
          return resolve(true);
        }
        else {
          return reject();
        }
      };
      sub = getSubRequest(component, query, req, res, respond);
      async.applyEachSeries(router.formio.resources.submission.handlers.beforeIndex, sub.req, sub.res, (err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  };

  // Loads all sub-references.
  const loadReferences = function(component, query, req, res) {
    return new Promise((resolve, reject) => {
      let sub = {};
      const respond = function() {
        if (!sub.res.statusCode || sub.res.statusCode < 300 || sub.res.statusCode === 416) {
          return resolve(sub.res.resource ? sub.res.resource.item : []);
        }
        else {
          return reject(sub.res.statusMessage);
        }
      };
      sub = getSubRequest(component, query, req, res, respond);
      if (router.resourcejs.hasOwnProperty(sub.req.url) && router.resourcejs[sub.req.url].hasOwnProperty('get')) {
        router.resourcejs[sub.req.url].get.call(this, sub.req, sub.res, respond);
      }
      else {
        return reject('Unknown resource handler.');
      }
    });
  };

  // Sets a resource object.
  const setResource = function(component, path, req, res) {
    const compValue = _.get(req.body.data, path);
    if (compValue && compValue._id && compValue.hasOwnProperty('data')) {
      if (!req.resources) {
        req.resources = {};
      }

      // Save for later.
      req.resources[compValue._id.toString()] = _.omit(compValue, hiddenFields);

      // Ensure we only set the _id of the resource.
      _.set(req.body.data, path, {
        _id: util.ObjectId(compValue._id)
      });
    }
    return Promise.resolve();
  };

  const getResource = function(component, path, req, res) {
    const resource = _.get(res, 'resource.item');
    if (!resource) {
      return Promise.resolve();
    }
    // Make sure to reset the value on the return result.
    const compValue = _.get(resource.data, path);
    if (!compValue || !compValue._id) {
      return Promise.resolve();
    }

    const compValueId = compValue._id.toString();
    if (compValue && req.resources && req.resources.hasOwnProperty(compValueId)) {
      _.set(resource.data, path, req.resources[compValueId]);
    }
    return Promise.resolve();
  };

  /**
   * Returns a query specific to this sub-reference.
   *
   * @param query
   * @param path
   * @return {{}}
   */
  const getSubQuery = function(formId, query, path) {
    const doesNotExist = {};
    doesNotExist[`data.${path}._id`] = {$exists: false};
    const withinForm = {};
    withinForm[`data.${path}.form`] = util.ObjectId(formId);
    withinForm[`data.${path}.deleted`] = {$eq: null};
    const subMatch = {
      $or: [
        doesNotExist,
        withinForm
      ]
    };

    const subQuery = {
      match: subMatch,
      sort: {}
    };

    // Look for filters.
    _.each(query, (value, param) => {
      if (param === `data.${path}._id`) {
        query[param] = util.ObjectId(value);
      }
      else if (param.indexOf(`data.${path}.`) === 0) {
        subQuery.match[param] = value;
        delete query[param];
      }
    });

    // Add sub sorts
    if (query.sort) {
      const sorts = query.sort.split(',');
      _.each(sorts, (sort, index) => {
        const negate = sort.indexOf('-') === 0;
        const sortParam = negate ? sort.substr(1) : sort;
        if (sortParam.indexOf(`data.${path}.`) === 0) {
          subQuery.sort[sortParam] = negate ? -1 : 1;
          delete sorts[index];
        }
      });
      query.sort = sorts.join(',');
    }

    // Get the find query for this resource.
    if (!_.isEmpty(subQuery.match)) {
      subQuery.match = router.formio.resources.submission.getFindQuery({
        query: subQuery.match
      });
    }

    return subQuery;
  };

  // Build a pipeline to load all references within an index.
  const buildPipeline = function(component, path, req, res) {
    // First check their access within this form.
    return checkAccess(component, req.query, req, res).then(() => {
      const formId = component.form || component.resource || component.data.resource;

      // Get the subquery.
      const subQuery = getSubQuery(formId, req.query, path);
      const subQueryReq = {query: subQuery.match};
      const subFindQuery = router.formio.resources.submission.getFindQuery(subQueryReq);

      // Create the pipeline for this component.
      let pipeline = [];

      // Load the reference.
      pipeline.push({
        $lookup: {
          from: 'submissions',
          localField: `data.${path}._id`,
          foreignField: '_id',
          as: `data.${path}`
        }
      });

      // Flatten the reference to an object.
      pipeline.push({
        $unwind: {
          path: `$data.${path}`,
          preserveNullAndEmptyArrays: true
        }
      });

      // Add a match if relevant.
      if (!_.isEmpty(subQuery.match)) {
        pipeline.push({
          $match: subFindQuery
        });
      }

      // Add a sort if relevant.
      if (!_.isEmpty(subQuery.sort)) {
        pipeline.push({
          $sort: subQuery.sort
        });
      }

      return new Promise((resolve, reject) => {
        // Load the form.
        router.formio.cache.loadForm(req, null, formId, function(err, form) {
          if (err) {
            return reject(err);
          }

          // Build the pipeline for the subdata.
          var queues = [];
          FormioUtils.eachComponent(form.components, (subcomp, subpath) => {
            if (subcomp.reference) {
              queues.push(buildPipeline(subcomp, `${path}.data.${subpath}`, req, res).then((subpipe) => {
                pipeline = pipeline.concat(subpipe);
              }));
            }
          });

          Promise.all(queues).then(() => resolve(pipeline)).catch((err) => reject(err));
        });
      });
    });
  };

  return {
    afterGet(component, path, req, res) {
      const resource = _.get(res, 'resource.item');
      if (!resource) {
        return Promise.resolve();
      }
      const compValue = _.get(resource.data, path);
      if (compValue && compValue._id) {
        return loadReferences(component, {
          _id: compValue._id,
          limit: 10000000
        }, req, res)
          .then(items => {
            if (items.length > 0) {
              _.set(resource.data, path, items[0]);
            }
            else {
              _.set(resource.data, path, _.pick(_.get(resource.data, path), ['_id']));
            }
          })
          .catch((err) => {
            _.set(resource.data, path, _.pick(_.get(resource.data, path), ['_id']));
          });
      }
    },
    beforeIndex(component, path, req, res) {
      return buildPipeline(component, path, req, res).then((subpipe) => {
        let pipeline = req.modelQuery.pipeline || [];
        pipeline = pipeline.concat(subpipe);
        req.countQuery.pipeline = req.modelQuery.pipeline = pipeline;
      });
    },
    afterPost: getResource,
    afterPut: getResource,
    beforePost: setResource,
    beforePut: setResource
  };
};
