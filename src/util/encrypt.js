'use strict';

const bcrypt = require('bcrypt');
module.exports = function(text, next) {
    bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            return next(err);
        }

        bcrypt.hash(text, salt, function(error, hash) {
            if (error) {
                return next(error);
            }

            next(null, hash);
        });
    });
};
