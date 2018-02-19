'use strict';

const _ = require('lodash');
const util = require('../../util/util');

module.exports = router => {
  const hiddenFields = ['deleted', '__v', 'machineName'];

  const loadReferences = function(component, path, ids, req, res) {
    const formId = component.form || component.resource || component.data.resource;

    // Here we will clone the request, and then change the request body
    // and parameters to make it seem like a separate request to get
    // the reference submission.
    const childReq = util.createSubRequest(req);
    if (!childReq) {
      return Promise.reject('Too many recursive requests.');
    }
    childReq.noResponse = true;
    childReq.formId = childReq.params.formId = formId;

    const method = 'get';

    childReq.url = '/form/:formId/submission';
    /* eslint-disable camelcase */
    childReq.query = {
      _id__in: ids.join(','),
      limit: 10000000
    };
    /* eslint-enable camelcase */
    childReq.method = method.toUpperCase();

    const childRes = util.createSubResponse();
    if (router.resourcejs.hasOwnProperty(childReq.url) && router.resourcejs[childReq.url].hasOwnProperty(method)) {
      return new Promise((resolve, reject) => {
        router.resourcejs[childReq.url][method].call(this, childReq, childRes, function(err) {
          if (!childRes.statusCode || childRes.statusCode < 300) {
            return resolve(childRes.resource.item);
          }
          else {
            return reject(childRes.statusMessage);
          }
        });
      });
    }
    else {
      return Promise.reject('Unknown resource handler.');
    }
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
    // Make sure to reset the value on the return result.
    const compValue = _.get(res.resource.item.data, path);
    if (compValue && req.resources && req.resources.hasOwnProperty(compValue._id)) {
      _.set(res.resource.item.data, path, req.resources[compValue._id]);
    }
    return Promise.resolve();
  };

  return {
    afterGet: function(component, path, req, res) {
      const resource = res.resource.item;
      const compValue = _.get(resource.data, path);
      if (compValue && compValue._id) {
        return loadReferences(component, path, [compValue._id], req, res)
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
    afterIndex: function(component, path, req, res) {
      const _ids = [];
      res.resource.item.map(resource => {
        const compValue = _.get(resource.data, path);
        if (compValue && compValue._id) {
          _ids.push(compValue._id);
        }
      });
      return loadReferences(component, path, _ids, req, res)
        .then(items => {
          const mappedItems = {};
          items.forEach(item => {
            mappedItems[item._id] = item;
          });

          res.resource.item.map(resource => {
            const compValue = _.get(resource.data, path);
            if (compValue && compValue._id) {
              if (mappedItems[compValue._id]) {
                _.set(resource.data, path, mappedItems[compValue._id]);
              }
              else {
                _.set(resource.data, path, _.pick(_.get(resource.data, path), ['_id']));
              }
            }
          });
        });
    },
    afterPost: getResource,
    afterPut: getResource,
    beforePost: setResource,
    beforePut: setResource
  };
};
