'use strict';

var mongoose = require('mongoose');

module.exports = function(formio) {
  var hook = require('../util/hook')(formio);

  /**
   * The base action to inherit from.
   *
   * @param data {object}
   *   The data for this action.
   * @param req
   * @param res
   *
   * @constructor
   */
  var Action = function(data, req, res) {
    this.title = data.title;
    this.action = data.action;
    this.handler = data.handler;
    this.method = data.method;
    this.priority = data.priority;
    this.form = data.form;
    this.settings = data.settings;
  };

  /**
   * The Action mongoose schema.
   *
   * @type {mongoose.Schema}
   */
  Action.schema = new mongoose.Schema({
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
    priority: {
      type: Number,
      require: true,
      default: 0
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'form',
      index: true,
      required: true
    },
    deleted: {
      type: Number,
      default: null
    }
  });

  // Add machineName to the schema.
  Action.schema.plugin(require('../plugins/machineName'));

  // Add machineName to the schema.
  Action.schema.plugin(require('../plugins/machineName'));

  Action.schema.machineName = function(document, done) {
    hook.alter('actionMachineName', document.name, document, done);
  };

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
  Action.prototype.resolve = function(handler, method, req, res, next) {};

  return Action;
}
