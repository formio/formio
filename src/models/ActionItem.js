'use strict';

module.exports = function(formio) {
  // Include the hook system.
  const hook = require('../util/hook')(formio);

  /**
   * The Schema for ActionItems.
   *
   * @type {exports.Schema}
   */
  const ActionItemSchema = hook.alter('actionItemSchema', new formio.mongoose.Schema({
    title: {
      type: String,
      required: true
    },
    form: {
      type: formio.mongoose.Schema.Types.ObjectId,
      ref: 'form',
      index: true,
      required: true
    },
    submission: {
      type: formio.mongoose.Schema.Types.ObjectId,
      ref: 'submission',
      index: true,
      required: false
    },
    action: {
      type: String,
      require: true
    },
    handler: {
      type: String,
      require: true
    },
    method: {
      type: String,
      require: true
    },
    state: {
      type: String,
      enum: ['new', 'inprogress', 'complete', 'error'],
      required: true,
      default: 'new',
      description: 'The current status of this event.',
    },
    messages: {
      type: []
    },
    data: {
      type: formio.mongoose.Schema.Types.Mixed
    }
  }));

  const model = require('./BaseModel')({
    schema: ActionItemSchema
  });

  try {
    model.schema.index({created: 1}, {expireAfterSeconds: 2592000});
  }
  catch (err) {
    console.log(err.message);
  }

  // Add indexes to speed up the action items pages.
  model.schema.index(hook.alter('schemaIndex', {state: 1, deleted: 1, modified: -1}));
  model.schema.index(hook.alter('schemaIndex', {handler: 1, deleted: 1, modified: -1}));
  model.schema.index(hook.alter('schemaIndex', {handler: 1, method: 1, deleted: 1, modified: -1}));

  return model;
};
