'use strict';

/**
 * @TODO: Add description.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  return function(handler) {
    return function formActionHandler(req, res, next) {
      router.formio.actions.execute(handler, 'form', req, res, function(err) {
        if (err) {
          return next(err);
        }

        // Only add the action for new forms.
        if (
          (handler === 'after') &&
          (req.method === 'POST') &&
          (res.resource && res.resource.item) &&
          (!req.body.noSave)
        ) {
          const Action = router.formio.actions.model;

          // Insert the save submission action for new forms.
          Action.create({
            name: 'save',
            title: 'Save Submission',
            form: res.resource.item._id,
            priority: 10,
            handler: ['before'],
            method: ['create', 'update'],
            settings: {}
          })
          .then(()=>next())
          .catch(err=>next(err));
        }
        else {
          return next();
        }
      });
    };
  };
};
