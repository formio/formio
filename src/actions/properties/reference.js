'use strict';

const _ = require('lodash');
const util = require('../../util/util');

module.exports = router => {
  const hiddenFields = ['deleted', '__v', 'machineName'];

  const loadReferences = function(component, path, query, req, res) {
    const formId = component.form || component.resource || component.data.resource;

    // Here we will clone the request, and then change the request body
    // and parameters to make it seem like a separate request to get
    // the reference submission.
    const childReq = util.createSubRequest(req);
    if (!childReq) {
      return Promise.reject('Too many recursive requests.');
    }
    childReq.noResponse = true;
    childReq.skipOwnerFilter = false;
    childReq.formId = childReq.params.formId = formId;

    const method = 'get';

    childReq.url = '/form/:formId/submission';
    childReq.query = query;
    childReq.method = method.toUpperCase();

    return new Promise((resolve, reject) => {
      const childRes = util.createSubResponse(() => {
        return resolve([]);
      });
      if (router.resourcejs.hasOwnProperty(childReq.url) && router.resourcejs[childReq.url].hasOwnProperty(method)) {
        router.resourcejs[childReq.url][method].call(this, childReq, childRes, function(err) {
          if (!childRes.statusCode || childRes.statusCode < 300) {
            return resolve(childRes.resource.item);
          }
          else {
            return reject(childRes.statusMessage);
          }
        });
      }
      else {
        return reject('Unknown resource handler.');
      }
    });
  };

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
        _id: compValue._id
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
    if (compValue && req.resources && req.resources.hasOwnProperty(compValue._id)) {
      _.set(resource.data, path, req.resources[compValue._id]);
    }
    return Promise.resolve();
  };

  const applyReferences = function(items, references, path) {
    // Do not apply if there are neither items nor references
    if (
      (!references || !references.length) ||
      (!items || !items.length)
    ) {
      return;
    }

    const mappedItems = {};
    references.forEach(reference => {
      mappedItems[reference._id.toString()] = reference;
    });

    items.forEach(item => {
      const compValue = _.get(item.data, path);
      if (compValue && compValue._id) {
        if (mappedItems[compValue._id]) {
          _.set(item.data, path, mappedItems[compValue._id]);
        }
        else {
          _.set(item.data, path, _.pick(_.get(item.data, path), ['_id']));
        }
      }
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
        return loadReferences(component, path, {
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
          });
      }
    },
    beforeIndex(component, path, req, res) {
      // Determine if any filters or sorts are applied to elements within this path.
      const subQuery = {};
      _.each(req.query, (value, param) => {
        if (param.indexOf(`data.${path}`) === 0) {
          subQuery[param.replace(new RegExp(`^data\\.${path}\\.`), '')] = value;
          delete req.query[param];
        }
      });

      // If there is a subquery to perform.
      if (!_.isEmpty(subQuery)) {
        if (req.query.limit) {
          subQuery.limit = req.query.limit;
        }

        if (req.query.sort) {
          let sort = req.query.sort;
          const negate = req.query.sort.indexOf('-') === 0;
          sort = negate ? sort.substr(1) : sort;
          if (sort.indexOf(`data.${path}`) === 0) {
            subQuery.sort = negate ? '-' : '';
            subQuery.sort += sort.replace(new RegExp(`^data\\.${path}\\.`), '');
            delete req.query.sort;
          }
        }

        // Perform this query first.
        return loadReferences(component, path, subQuery, req, res).then(items => {
          req.referenceItems = (items && items.length) ? items : [];
          const refIds = _.map(req.referenceItems, (item) => (item._id.toString()));
          let queryPath = `data.${path}._id`;
          if (refIds && refIds.length > 1) {
            queryPath += '__in';
          }
          if (!refIds || !refIds.length) {
            req.query[queryPath] = '0';
          }
          else if (refIds.length === 1) {
            req.query[queryPath] = refIds[0];
          }
          else {
            req.query[queryPath] = refIds.join(',');
          }
        });
      }
    },
    afterIndex(component, path, req, res) {
      const resources = _.get(res, 'resource.item');
      if (!resources) {
        return Promise.resolve();
      }

      // If this request has reference items, even if empty.
      if (req.hasOwnProperty('referenceItems')) {
        // Apply the found references.
        applyReferences(resources, req.referenceItems, path);
      }
      else {
        /* eslint-disable camelcase */
        return loadReferences(component, path, {
          _id__in: _.filter(_.map(resources, (resource) => {
            const _id = _.get(resource, `data.${path}._id`);
            return _id ? _id.toString() : null;
          })).join(','),
          limit: 10000000
        }, req, res).then(items => applyReferences(resources, items, path));
        /* eslint-enable camelcase */
      }
    },
    afterPost: getResource,
    afterPut: getResource,
    beforePost: setResource,
    beforePut: setResource
  };
};
