'use strict';

const _ = require('lodash');

/**
 * Middleware function to allow overriding 'created' and 'modified' timestamps
 * in request bodies, based on the presence of the 'x-allow-override-timestamps'
 * header and admin-level permissions.
 *
 * @param {Object} router - The Express router instance
 *
 * @returns {Function}
 */
module.exports = router  => (req, res, next) => {
    if (_.get(req.headers, 'x-allow-override-timestamps') && (req.adminKey || req.isAdmin)) {
        req.writeOptions = req.writeOptions || {};
        req.writeOptions.allowTimestampOverride = true;
        req.writeOptions.modified = req.body?.modified;
        req.writeOptions.created = req.body?.created;
    }
  next();
};
