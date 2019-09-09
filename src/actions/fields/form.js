'use strict';

const _ = require('lodash');
const utils = require('formiojs/utils').default;

module.exports = router => {
  /**
   * Perform hierarchial submissions of sub-forms.
   */
  const submitSubForms = function(component, path, validation, req, res, next) {
    // Only submit subforms after validation has occurred.
    if (!validation) {
      return next();
    }

    // Get the submission object.
    const subSubmission = _.get(req.body, `data.${path}`, {});

    // if there isn't a sub-submission or the sub-submission has an _id, don't submit.
    // Should be submitted from the frontend.
    if (
      (req.method === 'POST' && subSubmission._id) ||
      (req.method === 'PUT' && !subSubmission._id) ||
      (req.method === 'PUT' && subSubmission._id && _.isEmpty(subSubmission.data))
    ) {
      return next();
    }

    // Only execute if the component should save reference and conditions do not apply.
    if (
      (component.hasOwnProperty('reference') && !component.reference) ||
      !utils.checkCondition(component, {}, req.body.data)
    ) {
      return next();
    }

    let url = '/form/:formId/submission';
    if (req.method === 'PUT') {
      url += '/:submissionId';
    }
    const childRes = router.formio.util.createSubResponse((err) => {
      if (childRes.statusCode > 299) {
        // Add the parent path to the details path.
        if (err && err.details && err.details.length) {
          _.each(err.details, (details) => {
            if (details.path) {
              details.path = `${path}.data.${details.path}`;
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
    router.resourcejs[url][method](childReq, childRes, function(err) {
      if (err) {
        return next(err);
      }

      if (childRes.resource && childRes.resource.item) {
        _.set(req.body, `data.${path}`, childRes.resource.item);
      }
      next();
    });
  };

  /*
   * Set parent submission id in externalIds of child form component's submission
   */
  const setChildFormParenthood = function(component, path, validation, req, res, next) {
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
        submissionModel.findOne(
          {_id: compValue._id, deleted: {$eq: null}}
        ).exec(function(err, submission) {
          if (err) {
            return router.formio.util.log(err);
          }

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
            submission.save(function(err, submission) {
              if (err) {
                return router.formio.util.log(err);
              }
            });
          }
        });
      }
    }

    return next();
  };

  return {
    beforePost(component, path, validation, req, res, next) {
      return submitSubForms(component, path, validation, req, res, next);
    },
    afterPost(component, path, validation, req, res, next) {
      return setChildFormParenthood(component, path, validation, req, res, next);
    },
    beforePut(component, path, validation, req, res, next) {
      return submitSubForms(component, path, validation, req, res, next);
    },
    afterPut:  function(component, path, validation, req, res, next) {
      return setChildFormParenthood(component, path, validation, req, res, next);
    }
  };
};
