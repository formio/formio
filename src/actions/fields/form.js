'use strict';

const _ = require('lodash');
const util = require('../../util/util');

module.exports = (router) => {
  /**
   * Perform hierarchial submissions of sub-forms.
   */
  const submitSubForms = function(component, data, validation, req, res, path, fullPath, next) {
    // Only submit subforms after validation has occurred.
    if (!validation) {
      return next();
    }

    // Get the submission object.
    let subSubmission = _.get(data, component.key, {});
    const id = subSubmission._id ? subSubmission._id.toString() : null;
    subSubmission = _.cloneDeep(_.get(req, `resources.${id}`, subSubmission));

    // if there isn't a sub-submission or the sub-submission has an _id, don't submit.
    // Should be submitted from the frontend.
    if (
      (req.method === 'POST' && subSubmission._id) ||
      (req.method === 'PUT' && !subSubmission._id) ||
      (req.method === 'PUT' && subSubmission._id && _.isEmpty(subSubmission.data))
    ) {
      return next();
    }

    const isConditionallyHidden = () => {
      const submission = req.body;
      return _.some(
        submission?.scope?.conditionals || [],
        condComp => condComp.conditionallyHidden && (
          condComp.path === path ||
          _.startsWith(path, `${condComp.path}.`) ||
          _.startsWith(path, `${condComp.path}[`) ||
          _.startsWith(fullPath, `${condComp.path}.`)
        )
      );
    };
    // Only execute if the component should save reference and conditions do not apply.
    if (
      (component.hasOwnProperty('reference') && !component.reference) || isConditionallyHidden()
    ) {
      return next();
    }

    let url = '/form/:formId/submission';
    if (['PUT', 'PATCH'].includes(req.method)) {
      url += '/:submissionId';
    }
    const childRes = router.formio.util.createSubResponse((err) => {
      if (childRes.statusCode > 299) {
        // Add the parent path to the details path.
        if (err && err.details && err.details.length) {
          _.each(err.details, (details) => {
            if (details.path) {
              details.path = `${path}.data.${details.path}`;
              details.path = details.path.replace(/[[\]]/g, '.')
                .replace(/\.\./g, '.')
                .split('.')
                .map(part => _.defaultTo(_.toNumber(part), part));
            }
          });
        }

        return res.headersSent ? next() : res.status(childRes.statusCode).json(err);
      }
    });
    const childReq = router.formio.util.createSubRequest(req);
    if (!childReq) {
      return res.headersSent ? next() : res.status(400).json('Too many recursive requests.');
    }
    childReq.body = subSubmission;
    childReq.submission = subSubmission;

    // Make sure to pass along the submission state to the subforms.
    if (req.body.state) {
      childReq.body.state = req.body.state;
    }

    childReq.params.formId = component.form;
    if (subSubmission._id) {
      childReq.params.submissionId = subSubmission._id;
    }

    // Make the child request.
    const method = (req.method === 'POST') ? 'post' : 'put';

    if (req.method === 'PATCH') {
      childReq.subPatch = true;
    }

    router.resourcejs[url][method] (childReq, childRes, function(err) {
      if (err) {
        return next(err);
      }

      if (!req.query.dryrun) {
        if (childRes.resource && childRes.resource.item && childRes.resource.item._id) {
          // Set resources to return full submission on response
          if (!req.resources) {
            req.resources = {};
          }
          req.resources[childRes.resource.item._id.toString()] = childRes.resource.item;
          // Set child submission to { _id } to save only the reference
          _.set(data, component.key, {_id: childRes.resource.item._id});
        }
      }
      next();
    });
  };

  /*
   * Set parent submission id in externalIds of child form component's submission
   */
  const setChildFormParenthood = async function(component, data, validation, req, res, path, next) {
    if (
      res.resource &&
      res.resource.item &&
      res.resource.item.data &&
      (!component.hasOwnProperty('reference') || component.reference)
    ) {
      // Get child form component's value
      const compValue = _.get(res.resource.item.data, path);

      // Fetch the child form's submission
      if (compValue && compValue._id) {
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;
        try {
          const submission = await submissionModel.findOne(
            {_id: compValue._id, deleted: {$eq: null}}
          ).exec();
          if (!submission) {
            return router.formio.util.log('No subform found to update external ids.');
          }

          // Update the submission's externalIds.
          let found = false;
          submission.externalIds = submission.externalIds || [];
          _.each(submission.externalIds, function(externalId) {
            if (externalId.type === 'parent') {
              found = true;
            }
          });
          if (!found) {
            submission.externalIds.push({
              type: 'parent',
              id: res.resource.item._id
            });

            await submissionModel.updateOne({
              _id: submission._id},
              {$set: {externalIds: submission.externalIds}});
          }
        }
        catch (err) {
          return router.formio.util.log(err);
        }
      }
    }
    return;
  };

  return async (component, data, handler, action, {validation, path, fullPath, req, res}) => {
    switch (handler) {
      case 'beforePut':
      case 'beforePost':
        return new Promise((resolve, reject) => {
          submitSubForms(component, data, validation, req, res, path, fullPath, (err) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        });
      case 'afterPut':
      case 'afterPost':
        return await setChildFormParenthood(component, data, validation, req, res, path);
    }
  };
};
