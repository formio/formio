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

    if (router.resourcejs.hasOwnProperty(childReq.url) && router.resourcejs[childReq.url].hasOwnProperty(method)) {
      return new Promise((resolve, reject) => {
        const childRes = util.createSubResponse((err) => {
          if (!childRes.statusCode || childRes.statusCode < 300) {
            return resolve([]);
          }
          else {
            return reject(err);
          }
        });
        router.resourcejs[childReq.url][method].call(this, childReq, childRes, () => {
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

  /**
   * Applies the references to the returned list.
   *
   * @param items
   * @param references
   * @param path
   * @param orderByReference
   * @return {Array}
   */
  const applyReferences = function(items, references, path, limit, orderByReference) {
    // Do not apply if there are neither items nor references
    if (
      (!references || !references.length) ||
      (!items || !items.length)
    ) {
      return items;
    }

    const newItems = [];
    const mappedItems = {};
    const usedItems = {};
    if (orderByReference) {
      // Get all items that are referenced.
      _.each(items, (item) => {
        const compValue = _.get(item.data, path);
        if (compValue && compValue._id && !mappedItems[compValue._id]) {
          mappedItems[compValue._id] = item;
        }
      });

      // Add references first.
      references.forEach(reference => {
        if (mappedItems[reference._id]) {
          _.set(mappedItems[reference._id], `data.${path}`, reference);
          const item = mappedItems[reference._id];
          usedItems[item._id] = true;
          mappedItems[reference._id] = false;
          newItems.push(item);
        }
      });

      // Next add items that were not referenced.
      _.each(items, (item) => {
        if (!usedItems[item._id] && (newItems.length < limit)) {
          newItems.push(item);
        }
      });
    }
    else {
      references.forEach(reference => {
        mappedItems[reference._id.toString()] = reference;
      });

      items.forEach(item => {
        const compValue = _.get(item.data, path);
        if (compValue && compValue._id) {
          if (mappedItems[compValue._id]) {
            _.set(item, `data.${path}`, mappedItems[compValue._id]);
          }
          else {
            _.set(item, `data.${path}`, _.pick(_.get(item, `data.${path}`), ['_id']));
          }
        }
        newItems.push(item);
      });
    }

    return newItems;
  };

  /**
   * Returns all the referenced ids within this resource.
   *
   * @param req
   * @param path
   */
  const getSubIds = function(req, path) {
    return new Promise((resolve, reject) => {
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      submissionModel.find({
        form: req.formId,
        deleted: null
      })
        .distinct(`data.${path}._id`)
        .exec((err, ids) => {
          if (err) {
            return reject(err);
          }

          return resolve(ids);
        }
      );
    });
  };

  /**
   * Returns a query specific to this sub-reference.
   *
   * @param query
   * @param path
   * @return {{}}
   */
  const getSubQuery = function(query, path) {
    const subQuery = {};

    // Look for filters.
    _.each(query, (value, param) => {
      // Don't include the _id as a subQuery since this can be retrieved from the parent.
      if ((param !== `data.${path}._id`) && (param.indexOf(`data.${path}.`) === 0)) {
        subQuery.subFilter = true;
        subQuery[param.replace(new RegExp(`^data\\.${path}\\.`), '')] = value;
        delete query[param];
      }
    });

    // Add sub limit.
    if (query.limit) {
      subQuery.limit = query.limit;
    }

    // Add sub-selects.
    if (query.select) {
      const selects = query.select.split(',');
      const subSelects = [];
      let rootSelect = false;
      _.remove(selects, (select) => {
        if (select.indexOf(`data.${path}`) === 0) {
          if (select === `data.${path}`) {
            rootSelect = true;
          }
          else {
            subSelects.push(select.replace(new RegExp(`^data\\.${path}\\.`), ''));
          }
          return true;
        }
        return false;
      });

      if (subSelects.length) {
        if (!rootSelect) {
          // Need to make sure to include the root.
          selects.push(`data.${path}`);
        }
        subQuery.select = subSelects.join(',');
        query.select = selects.join(',');
      }
    }

    // Add sub sorts
    if (query.sort) {
      let sort = query.sort;
      const negate = query.sort.indexOf('-') === 0;
      sort = negate ? sort.substr(1) : sort;
      if (sort.indexOf(`data.${path}.`) === 0) {
        subQuery.subFilter = true;
        subQuery.sort = negate ? '-' : '';
        subQuery.sort += sort.replace(new RegExp(`^data\\.${path}\\.`), '');
        delete query.sort;
      }
    }

    return subQuery;
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
      req.subQuery = getSubQuery(req.query, path);
      if (req.subQuery.subFilter) {
        return getSubIds(req, path).then((resourceIds) => {
          delete req.subQuery.subFilter;

          /* eslint-disable camelcase */
          req.subQuery._id__in = _.filter(resourceIds);
          /* eslint-enable camelcase */

          return loadReferences(component, path, req.subQuery, req, res).then(items => {
            if (!req.referenceItems) {
              req.referenceItems = {};
            }
            req.referenceItems[path] = (items && items.length) ? items : [];
            // Make the limit huge so that we can get all duplicates, limits are establshied by the ID's of the
            // references added to the query.
            req.originalLimit = parseInt(req.query.limit, 10) || 10;
            req.query.limit = 1000000000;

            const refIds = _.map(req.referenceItems[path], (item) => (item._id.toString()));
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
              req.query[queryPath] = refIds;
            }
          });
        });
      }
    },
    afterIndex(component, path, req, res) {
      const resources = _.get(res, 'resource.item');
      if (!resources) {
        return Promise.resolve();
      }

      // If this request has reference items, even if empty.
      if (req.referenceItems && req.referenceItems[path]) {
        // Apply the found references.
        _.set(res, 'resource.item', applyReferences(
          resources,
          req.referenceItems[path],
          path,
          req.originalLimit,
          true
        ));
      }
      else {
        // Add a filter to the subquery.
        /* eslint-disable camelcase */
        req.subQuery._id__in = _.uniq(_.filter(_.map(resources, (resource) => {
          const _id = _.get(resource, `data.${path}._id`);
          return _id ? _id.toString() : null;
        })));
        /* eslint-enable camelcase */

        // Add a limit.
        req.subQuery.limit = 1000000000;
        return loadReferences(component, path, req.subQuery, req, res).then(
          items => _.set(res, 'resource.item', applyReferences(resources, items, path))
        );
      }
    },
    afterPost: getResource,
    afterPut: getResource,
    beforePost: setResource,
    beforePut: setResource
  };
};
