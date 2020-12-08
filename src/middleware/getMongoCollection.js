'use strict';

/**
 * Middleware to ensure that we are using proper mongoDb collection,
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = (router) => function(req,res,next) {
    const hook = require('../util/hook')(router.formio);
    const util = router.formio.util;

    // Build the dynamic mongoose query.
    const query = {
        _id: util.idToBson(req.formId),
        deleted: {$eq: null}
    };

    router.formio.resources.form.model.findOne(
        hook.alter('formQuery', query, req)
    ).lean().exec((err, result) => {
        if (err) {
            return next();
        }
        if (!result) {
            return next();
        }
        if (!(result.settings && result.settings.collection)) {
            return next();
        }

        const projectName = req.currentProject.name.replace(/[^A-Za-z0-9]+/g, '');
        const collection = result.settings.collection;
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
