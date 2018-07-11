'use strict';

const _ = require('lodash');

module.exports = router => {
  /**
   * Perform hierarchial submissions of sub-forms.
   */
  const submitSubForms = function(component, path, validation, req, res, next) {
    // Only submit subforms after validation has occurred.
    if (!validation) {
      return next();
    }

    const subSubmission = _.get(req.body, `data.${path}`, {});

    // if submission has an _id, don't submit. Should be submitted from the frontend.
    if (subSubmission._id) {
      return next();
    }

    const url = '/form/:formId/submission';
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

        return res.status(childRes.statusCode).json(err);
      }
    });
    const childReq = router.formio.util.createSubRequest(req);
    if (!childReq) {
      return res.status(400).json('Too many recursive requests.');
    }
    childReq.body = subSubmission;
    childReq.params.formId = component.form;
    router.resourcejs[url].post(childReq, childRes, function(err) {
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
    if (res.resource && res.resource.item && res.resource.item.data) {
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
