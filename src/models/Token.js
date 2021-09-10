'use strict';

module.exports = (formio) => {
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
      index: true,
      required: true,
      default: () => chance.string({
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        length: 30,
      }),
      validate: [
        {
          message: 'Token key must be unique.',
          async validator(key) {
            const search = hook.alter('tokenSearch', {key}, this, key);

            // Ignore the id of the token, if this is an update.
            if (this._id) {
              search._id = {$ne: this._id};
            }

            // Search for tokens that exist, with the given parameters.
            try {
              const result = await formio.mongoose.model('token').findOne(search).lean().exec();
              return !result;
            }
            catch (err) {
              return false;
            }
          },
        },
      ],
    },
    value: {
      type: String,
      required: true,
    },
    expireAt: {
      type: Date,
    },
  }));

  try {
    TokenSchema.index({expireAt: 1}, {expireAfterSeconds: 0});
  }
  catch (err) {
    console.log(err.message);
  }

  const model = require('./BaseModel')({
    schema: TokenSchema,
  });

  // Return the model
  return model;
};
