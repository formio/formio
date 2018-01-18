'use strict';

const _ = require('lodash');
const util = require('../../util/util');

module.exports = router => {
  const hiddenFields = ['deleted', '__v', 'machineName'];

  const loadReference = function(component, path, resource, req, res) {
    const formId = component.form || component.resource || component.data.resource;
    const compValue = _.get(resource.data, path);

    if (compValue && compValue._id) {
      // Here we will clone the request, and then change the request body
      // and parameters to make it seem like a separate request to get
      // the reference submission.
      const childReq = util.createSubRequest(req);
      if (!childReq) {
        return Promise.reject('Too many recursive requests.');
      }
      childReq.noResponse = true;
      childReq.formId = childReq.params.formId = formId;
      childReq.submissionId = childReq.params.submissionId = compValue._id;

      const method = 'get';

      childReq.url = '/form/:formId/submission/:submissionId';
      childReq.method = method.toUpperCase();

      const childRes = {
        send: () => _.noop,
        status: function(status) {
          this.statusCode = status;
        }
      };
      if (router.resourcejs.hasOwnProperty(childReq.url) && router.resourcejs[childReq.url].hasOwnProperty(method)) {
        return new Promise((resolve, reject) => {
          router.resourcejs[childReq.url][method].call(this, childReq, childRes, function(err) {
            if (!childRes.statusCode || childRes.statusCode < 300) {
              _.set(resource.data, path, childRes.resource.item);
            }
            else {
              // If they don't have access, only return the id.
              _.set(resource.data, path, _.pick(_.get(resource.data, path), ['_id']));
            }
            return resolve();
          });
        });
      }
      else {
        return Promise.reject('Unknown resource handler.');
      }
    }
    else {
      return Promise.resolve();
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
      return loadReference(component, path, res.resource.item, req, res);
    },
    afterIndex: function(component, path, req, res) {
      return Promise.all(res.resource.item.map(resource => {
        return loadReference(component, path, resource, req, res);
      }));
    },
    afterPost: getResource,
    afterPut: getResource,
    beforePost: setResource,
    beforePut: setResource
  };
};
