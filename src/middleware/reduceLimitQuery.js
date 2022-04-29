'use strict';

const maxLimit = 1000000;
module.exports = function(router) {
    return function(req, res, next) {
        if (!req.query.limit || req.query.limit > maxLimit) {
            req.query.limit = maxLimit;
        }
        next();
    };
};
