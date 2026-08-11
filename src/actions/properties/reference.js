'use strict';
const _ = require('lodash');
const util = require('../../util/util');
const async = require('async');
const loadComponentValueReferences = require('../../util/loadComponentValueReferences');

module.exports = (router) => {
  const hiddenFields = ['deleted', '__v', 'machineName'];
  const loadComponentValueReferencesFunc = loadComponentValueReferences(router);
  // Get a subrequest and sub response for a nested request.
  const getSubRequest = function (component, subQuery, req, res, response) {
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

  // Checks access within a form index and resolves with the processed sub-request so
  // buildPipeline can apply post-$lookup auth filtering. Running the referenced form's
  // beforeIndex chain enforces the same access gate a direct index would; we then derive
  // referenceHasReadAll for the owner decision (see buildLookupFilterCond for why this is
  // computed here rather than read off the sub-request's owner-filter state).
  const checkAccess = function (component, query, req, res) {
    return new Promise((resolve, reject) => {
      let sub = {};
      const respond = function () {
        if (!sub.res.statusCode || sub.res.statusCode < 300 || sub.res.statusCode === 416) {
          return resolve(sub.req);
        } else {
          return reject();
        }
      };
      try {
        sub = getSubRequest(component, null, req, res, respond);
      } catch (err) {
        return reject(err);
      }
      async.series(
        router.formio.resources.submission.handlers.beforeIndex.map((fn) => {
          return async.apply(fn, sub.req, sub.res);
        }),
        (err) => {
          if (err) {
            return reject(err);
          }

          // Determine read_all access on the referenced form by crossing its read_all
          // role list against the caller's roles (req.accessRoles, set on the parent
          // request by permissionHandler). This is computed independently of the
          // sub-request's skipOwnerFilter/ownerFilter, which do not run reliably on the
          // $lookup path — see buildLookupFilterCond.
          router.formio.cache
            .loadForm(sub.req, null, sub.req.formId)
            .then((refForm) => {
              sub.req.referenceHasReadAll = util.checkReferenceReadAccess(refForm, null, req);
              return resolve(sub.req);
            })
            .catch(() => {
              sub.req.referenceHasReadAll = false;
              return resolve(sub.req);
            });
        },
      );
    });
  };

  // Sets a resource object.
  const setResource = function (component, path, req) {
    const compValue = _.get(req.body.data, path);
    if (!compValue) {
      return Promise.resolve();
    }
    if (!req.resources) {
      req.resources = {};
    }

    const stripItem = (item) => {
      if (!item || !item._id) {
        return item;
      }
      // Save for later.
      req.resources[item._id.toString()] = _.omit(item, hiddenFields);
      // Ensure we only persist the _id of the resource.
      return { _id: util.ObjectId(item._id) };
    };

    if (component.multiple && _.isArray(compValue)) {
      _.set(req.body.data, path, compValue.map(stripItem));
    } else if (compValue._id) {
      _.set(req.body.data, path, stripItem(compValue));
    }
    return Promise.resolve();
  };

  const getResource = function (component, path, req, res) {
    const resource = _.get(res, 'resource.item');
    if (!resource) {
      return Promise.resolve();
    }
    const compValue = _.get(resource, `data.${path}`);
    if (!compValue) {
      return Promise.resolve();
    }

    const restoreItem = (item) => {
      if (!item || !item._id) {
        return item;
      }
      const id = item._id.toString();
      return req.resources && Object.prototype.hasOwnProperty.call(req.resources, id)
        ? req.resources[id]
        : item;
    };

    if (component.multiple && _.isArray(compValue)) {
      _.set(resource, `data.${path}`, compValue.map(restoreItem));
    } else if (compValue._id) {
      _.set(resource, `data.${path}`, restoreItem(compValue));
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
  const getSubQuery = function (formId, query, path) {
    const doesNotExist = {};
    doesNotExist[`data.${path}._id`] = { $exists: false };
    const withinForm = {};
    withinForm[`data.${path}.form`] = util.ObjectId(formId);
    withinForm[`data.${path}.deleted`] = { $eq: null };

    // Create the subquery.
    const subQuery = {
      match: {
        $or: [doesNotExist, withinForm],
      },
      sort: {},
    };

    // Look for filters.
    _.each(query, (value, param) => {
      if (param === `data.${path}._id`) {
        query[param] = util.ObjectId(value);
      } else if (param.indexOf(`data.${path}.`) === 0) {
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
    subQuery.match = router.formio.resources.submission.getFindQuery(
      {
        query: subQuery.match,
      },
      {
        convertIds: new RegExp(`data.${path}._id`),
      },
    );

    return subQuery;
  };

  // Builds $filter conditions applied after an equality-match $lookup. Enforces form
  // isolation, the delete filter, and an owner restriction for non-read_all callers.
  //
  // DocumentDB/Cosmos reject $lookup.let / pipeline, so auth cannot run inside the join
  // (FIO-12058). Equality-match $lookup correlates on _id; this post-filter keeps the
  // FIO-11566 access semantics.
  //
  // The owner decision uses subReq.referenceHasReadAll (computed in checkAccess) rather
  // than the sub-request's skipOwnerFilter/ownerFilter state: on the $lookup path the
  // sub-request's permissionHandler/ownerFilter do not run reliably (skipOwnerFilter can
  // carry over as true from a read_all parent), so reusing that state would skip the owner
  // restriction and leak read_own submissions owned by other users.
  //   - referenceHasReadAll (read_all / admin): no owner restriction.
  //   - otherwise (read_own): restrict the lookup to submissions owned by the caller.
  const buildLookupFilterCond = function (formId, subReq) {
    const conditions = [
      { $eq: ['$$item.form', util.ObjectId(formId)] },
      { $eq: ['$$item.deleted', null] },
    ];

    const hasCallerUserId = subReq.user && subReq.user._id;
    const restrictToOwner = !subReq.referenceHasReadAll && hasCallerUserId;
    if (restrictToOwner) {
      conditions.push({ $eq: ['$$item.owner', util.ObjectId(subReq.user._id)] });
    }

    return { $and: conditions };
  };

  // Parent-pipeline $addFields that $convert(s) reference _id(s) to ObjectId before
  // equality-match $lookup. Kept outside $lookup (no let/pipeline) for DocumentDB (FIO-12058).
  const buildReferenceIdNormalizeStage = function (path) {
    const dataPath = `$data.${path}`;
    const toObjectId = function (input) {
      return {
        $convert: {
          input,
          to: 'objectId',
          onError: input,
          onNull: input,
        },
      };
    };

    return {
      $addFields: {
        [`data.${path}`]: {
          $cond: [
            { $isArray: dataPath },
            {
              $map: {
                input: dataPath,
                as: 'item',
                in: {
                  $mergeObjects: ['$$item', { _id: toObjectId('$$item._id') }],
                },
              },
            },
            {
              $cond: [
                {
                  $and: [
                    { $ne: [dataPath, null] },
                    { $eq: [{ $type: dataPath }, 'object'] },
                  ],
                },
                {
                  $mergeObjects: [dataPath, { _id: toObjectId(`${dataPath}._id`) }],
                },
                dataPath,
              ],
            },
          ],
        },
      },
    };
  };

  // Build a pipeline to load all references within an index.
  const buildPipeline = function (component, path, req, res) {
    // First check their access within this form. checkAccess resolves with the processed
    // sub-request carrying referenceHasReadAll, which buildLookupFilterCond uses to decide
    // whether the post-$lookup $filter needs an owner restriction.
    return checkAccess(component, req.query, req, res).then(async (subReq) => {
      const formId = component.form || component.resource || component.data.resource;
      const form = await router.formio.cache.loadForm(req, null, formId);

      // Get the subquery.
      const subQuery = getSubQuery(formId, req.query, path);
      const subQueryReq = { query: subQuery.match };
      const subFindQuery = router.formio.resources.submission.getFindQuery(subQueryReq);

      // Create the pipeline for this component.
      let pipeline = [];
      const submissionsCollectionName =
        form.settings && form.settings.collection
          ? `${req.currentProject.name.replace(
              /[^A-Za-z0-9]+/g,
              '',
            )}_${form.settings.collection.replace(/[^A-Za-z0-9]+/g, '')}`
          : 'submissions';

      const origField = `__ref_orig_${path.replace(/\./g, '_')}`;
      pipeline.push({
        $addFields: {
          [origField]: { $ifNull: [`$data.${path}`, null] },
        },
      });

      // Normalize reference _id(s) to ObjectId before equality-match $lookup. Multiples and
      // some nested-form writes store string ids; FIO-11566 used $convert inside $lookup.let
      // (rejected on DocumentDB). $convert in a parent $addFields stays vendor-safe (FIO-12058).
      pipeline.push(buildReferenceIdNormalizeStage(path));

      // Load the reference via equality-match $lookup (DocumentDB/Cosmos-safe; FIO-12058).
      // Access control (form / deleted / owner) is applied in the post-filter below.
      pipeline.push({
        $lookup: {
          from: submissionsCollectionName,
          localField: `data.${path}._id`,
          foreignField: '_id',
          as: `data.${path}`,
        },
      });

      // Restrict joined docs to the referenced form, non-deleted rows, and (when needed)
      // the caller's own submissions — same gates as the former in-pipeline $match.
      pipeline.push({
        $addFields: {
          [`data.${path}`]: {
            $filter: {
              input: { $ifNull: [`$data.${path}`, []] },
              as: 'item',
              cond: buildLookupFilterCond(formId, subReq),
            },
          },
        },
      });

      // Flatten the reference to an object if we are not configured as multiple.
      if (!component.multiple) {
        pipeline.push({
          $unwind: {
            path: `$data.${path}`,
            preserveNullAndEmptyArrays: true,
          },
        });
      }

      // Add a match if relevant.
      if (!_.isEmpty(subQuery.match)) {
        pipeline.push({
          $match: subFindQuery,
        });
      }

      // Add a sort if relevant.
      if (!_.isEmpty(subQuery.sort)) {
        pipeline.push({
          $sort: subQuery.sort,
        });
      }

      if (!component.multiple) {
        pipeline.push({
          $addFields: {
            [`data.${path}`]: { $ifNull: [`$data.${path}`, `$${origField}`] },
          },
        });
      } else {
        pipeline.push({
          $addFields: {
            [`data.${path}`]: {
              $cond: [
                { $gt: [{ $size: { $ifNull: [`$data.${path}`, []] } }, 0] },
                `$data.${path}`,
                { $ifNull: [`$${origField}`, []] },
              ],
            },
          },
        });
      }
      pipeline.push({ $unset: origField });

      return new Promise((resolve, reject) => {
        // Build the pipeline for the subdata.
        var queues = [];
        util.FormioUtils.eachComponent(form.components, (subcomp, subpath) => {
          if (subcomp.reference) {
            queues.push(
              buildPipeline(subcomp, `${path}.data.${subpath}`, req, res).then((subpipe) => {
                pipeline = pipeline.concat(subpipe);
              }),
            );
          }
        });

        Promise.all(queues)
          .then(() => resolve(pipeline))
          .catch((err) => reject(err));
      });
    });
  };

  return async (component, data, handler, action, { path, req, res }) => {
    const formId = component.form || component.resource || component.data.resource;

    switch (handler) {
      case 'afterGet': {
        const resource = _.get(res, 'resource.item');
        const compValue = _.get(resource, `data.${path}`);
        if (!resource) {
          return Promise.resolve();
        }
        if (!compValue) {
          return Promise.resolve();
        }
        return loadComponentValueReferencesFunc(component, compValue, req)
          .then((items) => {
            if (items.length > 0) {
              _.set(resource, `data.${path}`, component.multiple ? items : items[0]);
            } else {
              if (component.multiple) {
                _.set(
                  resource,
                  `data.${path}`,
                  _.map(_.get(resource, `data.${path}`), (iData) => _.pick(iData, ['_id'])),
                );
              } else {
                _.set(resource, `data.${path}`, _.pick(_.get(resource, `data.${path}`), ['_id']));
              }
            }
          })
          .catch(() => {
            if (component.multiple) {
              _.set(
                resource,
                `data.${path}`,
                _.map(_.get(resource, `data.${path}`), (iData) => _.pick(iData, ['_id'])),
              );
            } else {
              _.set(resource, `data.${path}`, _.pick(_.get(resource, `data.${path}`), ['_id']));
            }
          });
      }
      case 'beforeIndex':
        return buildPipeline(component, path, req, res).then((subpipe) => {
          let pipeline = req.modelQuery.pipeline || [];
          pipeline = pipeline.concat(subpipe);
          req.modelQuery.pipeline = pipeline;
          // The pipeline for references is not needed to get the count of documents
          req.countQuery.pipeline = req.countQuery.pipeline || [];
        });
      case 'afterIndex': {
        const form = await router.formio.cache.loadForm(req, null, formId);
        if (res.resource && Array.isArray(res.resource.item)) {
          util.removeProtectedFields(
            form,
            'index',
            res.resource.item.map((submission) => {
              return _.get(submission, `data.${path}`);
            }),
          );
        }
        return form;
      }
      case 'beforePost':
        return setResource(component, path, req, res);
      case 'afterPost':
        return getResource(component, path, req, res);
      case 'beforePut':
        return setResource(component, path, req, res);
      case 'afterPut':
        return getResource(component, path, req, res);
      case 'beforePatch':
        return setResource(component, path, req, res);
      case 'afterPatch':
        return getResource(component, path, req, res);
    }
  };
};
