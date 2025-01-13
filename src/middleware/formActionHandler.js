'use strict';

/**
 * @TODO: Add description.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  return function(handler) {
    return async function formActionHandler(req, res, next) {
      try {
        await router.formio.actions.execute(handler, 'form', req, res);

        // Only add the action for new forms.
        if (
          (handler === 'after') &&
          (req.method === 'POST') &&
          (res.resource && res.resource.item) &&
          (!req.body.noSave)
        ) {
          const Action = router.formio.actions.model;

          // Insert the save submission action for new forms.
          try {
            await Action.create({
              name: 'save',
              title: 'Save Submission',
              form: res.resource.item._id,
              priority: 10,
              handler: ['before'],
              method: ['create', 'update'],
              settings: {}
            });
            return next();
          }
          catch (err) {
            return next(err);
          }
        }
        else {
          return next();
        }
      }
      catch (err) {
        return next(err);
      }
    };
  };
};
