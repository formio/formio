'use strict';

module.exports = (router) => (req, res, next) => {
  router.formio.cache.loadCurrentForm(req, async (err, form) => {
    if (!form) {
      return next();
    }

    try {
      await router.formio.util.Formio.createForm(form);
      return next();
    }
    catch (error) {
      return next(error);
    }
  });
};
