'use strict';

module.exports = function(formio) {
  // Include the hook system.
  const hook = require('../util/hook')(formio);

  const chance = new (require('chance'))();

  /**
   * The Schema for Tokens.
   *
   * @type {exports.Schema}
   */
  const TokenSchema = hook.alter('tokenSchema', new formio.mongoose.Schema({
    key: {
      type: String,
      required: true,
      default: () => chance.string({
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        length: 30
      }),
      validate: [
        {
          isAsync: true,
          message: 'Token key must be unique.',
          validator(key, done) {
            const search = hook.alter('tokenSearch', {key: key}, this, key);

            // Ignore the id of the token, if this is an update.
            if (this._id) {
              search._id = {$ne: this._id};
            }

            // Search for tokens that exist, with the given parameters.
            formio.mongoose.model('token').findOne(search, function(err, result) {
              if (err || result) {
                return done(false);
              }

              done(true);
            });
          }
        }
      ]
    },
    value: {
      type: String,
      required: true
    },
    expireAt: {
      type: Date
    }
  }));

  TokenSchema.index({expireAt: 1}, {expireAfterSeconds: 0});

  const model = require('./BaseModel')({
    schema: TokenSchema
  });

  // Return the model
  return model;
};
