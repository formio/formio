'use strict';

var _ = require('lodash');

module.exports = function(formio) {
  // Set parent submission id in externalIds of child form component's submission
  var setChildFormParenthood = function(component, path, validation, req, res, next) {
    if (res.resource && res.resource.item && res.resource.item.data) {
      // Get child form component's value
      let compValue = _.get(res.resource.item.data, path);

      // Fetch the child form's submission
      if (compValue && compValue._id) {
        formio.resources.submission.model.findOne(
          {_id: compValue._id, deleted: {$eq: null}}
        ).exec(function(err, submission) {
          if (err) {
            return formio.util.log(err);
          }

          // Update the submission's externalIds.
          var found = false;
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
                return formio.util.log(err);
              }
            });
          }
        });
      }
    }

    return next();
  };

  return {
    afterPost: function(component, path, validation, req, res, next) {
      return setChildFormParenthood(component, path, validation, req, res, next);
    },

    afterPut:  function(component, path, validation, req, res, next) {
      return setChildFormParenthood(component, path, validation, req, res, next);
    }
  };
};
