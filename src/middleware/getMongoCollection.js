'use strict';

/**
 * Middleware to ensure that we are using proper mongoDb collection,
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = (router) => function(req,res,next) {
    router.formio.cache.loadCurrentForm(req, (err, form) => {
        if (err) {
            return next();
        }
        if (!form) {
            return next();
        }
        if (!(form.settings && form.settings.collection)) {
            return next();
        }

        const projectName = req.currentProject.name.replace(/[^A-Za-z0-9]+/g, '');
        const collection = form.settings.collection;
        const submissionModel = router.formio.mongoose.model(
            `${projectName}_${collection}`,
            router.formio.mongoose.modelSchemas.submission,
            `${projectName}_${collection}`
        );
        req.modelQuery = req.modelQuery || submissionModel;
        req.countQuery = req.countQuery || submissionModel;

        return next();
    });
};
