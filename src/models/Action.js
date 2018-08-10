'use strict';

module.exports = function(formio) {
  const hook = require('../util/hook')(formio);

  /**
   * The base action to inherit from.
   *
   * @param data {object}
   *   The data for this action.
   * @param req
   * @param res
   */
  class Action {
    constructor(data) {
      this.name = data.name;
      this.title = data.title;
      this.action = data.action;
      this.handler = data.handler;
      this.method = data.method;
      this.priority = data.priority;
      this.form = data.form;
      this.settings = data.settings;
      this.condition = data.condition;
    }

    /**
     * Resolve the action using the current request.
     *
     * Note: This is to be overwritten by any child actions.
     *
     * @param handler
     *   The handler for the resolution.
     * @param method
     *   The method of execution.
     * @param req
     *   The Express request object.
     * @param res
     *   The Express response object.
     * @param next
     *   The callback function to be executed after processing.
     */
    resolve(handler, method, req, res, next) {}
  }

  /**
   * The Action mongoose schema.
   *
   * @type {mongoose.Schema}
   */
  Action.schema = new formio.mongoose.Schema({
    title: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    handler: [{
      type: String,
      require: true
    }],
    method: [{
      type: String,
      require: true
    }],
    condition: {
      type: formio.mongoose.Schema.Types.Mixed,
      required: false
    },
    priority: {
      type: Number,
      require: true,
      default: 0
    },
    settings: {
      type: formio.mongoose.Schema.Types.Mixed,
      required: false
    },
    form: {
      type: formio.mongoose.Schema.Types.ObjectId,
      ref: 'form',
      index: true,
      required: true
    },
    deleted: {
      type: Number,
      index: true,
      default: null
    }
  });

  // Add machineName to the schema.
  Action.schema.plugin(require('../plugins/machineName')('action', formio));

  Action.schema.machineName = function(document, done) {
    formio.mongoose.model('form').findOne({_id: document.form, deleted: {$eq: null}})
      .exec((err, form) => {
        if (err) {
          return done(err);
        }

        if (!form) {
          hook.alter('actionMachineName', `${document.form}:${document.name}`, document, done);
          return;
        }

        hook.alter('actionMachineName', `${form.name}:${document.name}`, document, done);
      });
  };

  return Action;
};
