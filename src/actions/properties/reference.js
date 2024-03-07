'use strict';
const _ = require('lodash');
const util = require('../../util/util');
const async = require('async');

module.exports = (router) => {
  const hiddenFields = ['deleted', '__v', 'machineName'];

  // Get a subrequest and sub response for a nested request.
  const getSubRequest = function(component, subQuery, req, res, response) {
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
      throw new Error('Too many recursive requests.');
    }
    sub.req.noResponse = true;
    sub.req.skipOwnerFilter = false;
    sub.req.formId = sub.req.params.formId = formId;
    sub.req.doNotMinify = true;

    // Make sure to change the submission id.
    if (subQuery && subQuery._id) {
      sub.req.subId = subQuery._id;
    }
    else {
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
      try {
          sub = getSubRequest(component, null, req, res, respond);
      }
      catch (err) {
        return reject(err);
      }
      async.series(router.formio.resources.submission.handlers.beforeIndex.map((fn) => {
        return async.apply(fn, sub.req, sub.res);
      }), (err) => {
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
      try {
          sub = getSubRequest(component, query, req, res, respond);
      }
      catch (err) {
        return reject(err);
      }
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
    if (compValue && compValue._id) {
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
    const compValue = _.get(resource, `data.${path}`);
    if (!compValue || !compValue._id) {
      return Promise.resolve();
    }

    const compValueId = compValue._id.toString();
    if (compValue && req.resources && req.resources.hasOwnProperty(compValueId)) {
      _.set(resource, `data.${path}`, req.resources[compValueId]);
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

    // Create the subquery.
    const subQuery = {
      match: {
        $or: [
          doesNotExist,
          withinForm
        ]
      },
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
    subQuery.match = router.formio.resources.submission.getFindQuery({
      query: subQuery.match
    }, {
      convertIds: new RegExp(`data.${path}._id`)
    });

    return subQuery;
  };

  // Build a pipeline to load all references within an index.
  const buildPipeline = function(component, path, req, res) {
    // First check their access within this form.
    return checkAccess(component, req.query, req, res).then(async () => {
      const formId = component.form || component.resource || component.data.resource;
      const form = await new Promise((resolve, reject) =>
        router.formio.cache.loadForm(req, null, formId, (err, form) => {
          if (err) {
            return reject(err);
          }
          resolve(form);
        })
      );
      // Get the subquery.
      const subQuery = getSubQuery(formId, req.query, path);
      const subQueryReq = {query: subQuery.match};
      const subFindQuery = router.formio.resources.submission.getFindQuery(subQueryReq);

      // Create the pipeline for this component.
      let pipeline = [];
      const submissionsCollectionName =
        form.settings && form.settings.collection
          ? `${req.currentProject.name.replace(
              /[^A-Za-z0-9]+/g,
              ''
            )}_${form.settings.collection.replace(/[^A-Za-z0-9]+/g, '')}`
          : 'submissions';
      // Load the reference.
      pipeline.push({
        $lookup: {
          from: submissionsCollectionName,
          localField: `data.${path}._id`,
          foreignField: '_id',
          as: `data.${path}`
        }
      });

      // Flatten the reference to an object if we are not configured as multiple.
      if (!component.multiple) {
        pipeline.push({
          $unwind: {
            path: `$data.${path}`,
            preserveNullAndEmptyArrays: true
          }
        });
      }

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
        // Build the pipeline for the subdata.
        var queues = [];
        util.FormioUtils.eachComponent(form.components, (subcomp, subpath) => {
          if (subcomp.reference) {
            queues.push(buildPipeline(subcomp, `${path}.data.${subpath}`, req, res).then((subpipe) => {
              pipeline = pipeline.concat(subpipe);
            }));
          }
        });

        Promise.all(queues).then(() => resolve(pipeline)).catch((err) => reject(err));
      });
    });
  };

  return async (component, data, handler, action, {validation, path, req, res}) => {
    const resource = _.get(res, 'resource.item');
    const compValue = _.get(resource, `data.${path}`);
    const formId = component.form || component.resource || component.data.resource;
    let idQuery = null;

    switch (handler) {
      case 'afterGet':
        if (!resource) {
          return Promise.resolve();
        }
        if (!compValue) {
          return Promise.resolve();
        }

        if (component.multiple && _.isArray(compValue)) {
          idQuery = {$in: []};
          _.map(compValue, (val) => idQuery.$in.push(util.ObjectId(val._id)));
        }
        else if (compValue._id) {
          idQuery = util.ObjectId(compValue._id);
        }

        if (!idQuery) {
          return Promise.resolve();
        }
        return loadReferences(component, {
          _id: idQuery,
          limit: 10000000
        }, req, res)
          .then(items => {
            if (items.length > 0) {
              _.set(resource, `data.${path}`, component.multiple ? items : items[0]);
            }
            else {
              if (component.multiple) {
                _.set(
                  resource,
                  `data.${path}`,
                  _.map(_.get(resource, `data.${path}`), iData => _.pick(iData, ['_id']))
                );
              }
              else {
                _.set(resource, `data.${path}`, _.pick(_.get(resource, `data.${path}`), ['_id']));
              }
            }
          })
          .catch((err) => {
            if (component.multiple) {
              _.set(resource, `data.${path}`, _.map(_.get(resource, `data.${path}`), iData => _.pick(iData, ['_id'])));
            }
            else {
              _.set(resource, `data.${path}`, _.pick(_.get(resource, `data.${path}`), ['_id']));
            }
          });
      case 'beforeIndex':
        return buildPipeline(component, path, req, res).then((subpipe) => {
          let pipeline = req.modelQuery.pipeline || [];
          pipeline = pipeline.concat(subpipe);
          req.countQuery.pipeline = req.modelQuery.pipeline = pipeline;
        });
      case 'afterIndex':
        return new Promise((resolve, reject) => {
          router.formio.cache.loadForm(req, null, formId, function(err, form) {
            if (err) {
              return reject(err);
            }
            if (res.resource && Array.isArray(res.resource.item)) {
              util.removeProtectedFields(form, 'index', res.resource.item.map(submission => {
                return _.get(submission, `data.${path}`);
              }));
            }
            resolve();
          });
        });
      case 'beforePost':
        return setResource(component, path, req, res);
       case 'afterPost':
         return getResource(component, path, req, res);
      case 'beforePut':
        return setResource(component, path, req, res);
       case 'afterPut':
         return getResource(component, path, req, res);
    }
  };
};
