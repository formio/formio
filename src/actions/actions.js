'use strict';

var Resource = require('resourcejs');
var async = require('async');
var mongoose = require('mongoose');
var _ = require('lodash');
var debug = {
  search: require('debug')('formio:action#search'),
  execute: require('debug')('formio:action#execute')
};

/**
 * The ActionIndex export.
 *
 * @param router
 *
 * @returns {{actions: {}, register: Function, search: Function, execute: Function}}
 */
module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);

  /**
   * Create the ActionIndex object.
   *
   * @type {{actions: {}, register: Function, search: Function, execute: Function}}
   */
  var ActionIndex = {

    /**
     * A list of all the actions.
     */
    actions: hook.alter('actions', {
      default: require('./DefaultAction')(router),
      auth: require('./AuthAction')(router),
      email: require('./EmailAction')(router),
      webhook: require('./WebhookAction')(router),
      sql: require('./SQLAction')(router),
      role: require('./RoleAction')(router),
      resetpass: require('./ResetPassword')(router)
    }),

    /**
     * The model to use for each Action.
     */
    model: mongoose.model('action', hook.alter('actionSchema', Action.schema)),

    /**
     * Allow search capabilities for finding an Action.
     *
     * @param handler
     * @param method
     * @param form
     * @param next
     */
    search: function(handler, method, form, next) {
      if (!form) {
        return next();
      }

      async.waterfall([
        function queryMongo(callback) {
          this.model
            .find({
              handler: handler,
              method: method,
              form: form,
              deleted: {$eq: null}
            })
            .sort('-priority')
            .exec(function(err, rows) {
              if (err) {
                return callback(err);
              }

              // Execute the callback.
              callback(null, rows);
            });
        }.bind(this),
        function processResults(rows, callback) {
          rows = rows || [];

          if (handler === 'before') {
            // Include default action.
            var includeDefault = true;

            // Iterate through each action.
            _.each(rows, function(row) {
              // If there is already a default action.
              if (row.name === 'default') {
                includeDefault = false;
                return false;
              }

              // Make sure this is a valid action.
              if (!this.actions.hasOwnProperty(row.name)) {
                return callback(new Error('Invalid Action'));
              }

              // If we need to skip the default action.
              if (this.actions[row.name].skipDefault) {
                includeDefault = false;
                return false;
              }
            }.bind(this));

            // Only add the default action if it should be included.
            if (includeDefault) {
              var defaultAction = {
                title: 'Default',
                name: 'default',
                handler: ['before'],
                method: ['create', 'update'],
                priority: 10,
                form: form,
                settings: {}
              };
              // Insert at index that keeps priority order intact
              var index = _.sortedIndex(rows, defaultAction, function(action) {
                return -action.priority;
              });
              rows.splice(index, 0, defaultAction);
            }
          }

          // Execute the callback.
          callback(null, rows);
        }.bind(this)
      ], function(err, results) {
        if (err) {
          debug.search(err);
          return next(err);
        }

        next(null, results);
      });
    },

    /**
     * Execute an action provided a handler, form, and request params.
     *
     * @param handler
     * @param method
     * @param req
     * @param res
     * @param next
     */
    execute: function(handler, method, req, res, next) {
      if (!req.formId) {
        return next();
      }

      async.waterfall([
        function actionSearch(callback) {
          this.search(handler, method, req.formId, function(err, result) {
            if (err) {
              return callback(err);
            }

            callback(null, result);
          });
        }.bind(this),
        function actionExecute(result, callback) {
          if (!result) {
            return callback(null, null);
          }

          // The actions to execute.
          var actions = [];

          // Iterate over each action.
          _.each(result, function(action) {
            if (!action.name) {
              return callback(new Error('No action was provided'));
            }
            if (!this.actions.hasOwnProperty(action.name)) {
              return callback(new Error('Action not found.'));
            }

            var ActionClass = this.actions[action.name];
            actions.push(new ActionClass(action, req, res));
          }.bind(this));

          // Iterate and execute each action.
          async.eachSeries(actions, function(action, cb) {
            action.resolve(handler, method, req, res, cb);
          }, function(err) {
            if (err) {
              return callback(err);
            }

            callback();
          });
        }.bind(this)
      ], function(err) {
        if (err) {
          debug.execute(err);
          return next(err);
        }

        next();
      });
    }
  };

  /**
   * Get the settings form for each action.
   *
   * @param action
   */
  var getSettingsForm = function(action) {
    // The default settings form.
    var settingsForm = {
      components: [
        {type: 'hidden', input: true, key: 'priority'},
        {type: 'hidden', input: true, key: 'name'},
        {type: 'hidden', input: true, key: 'title'}
      ]
    };

    // If the defaults are read only.
    if (action.access && (action.access.handler === false)) {
      settingsForm.components.push({
        type: 'hidden',
        input: true,
        key: 'handler'
      });
    }
    else {
      settingsForm.components.push({
        type: 'select',
        input: true,
        key: 'handler',
        label: 'Handler',
        placeholder: 'Select which handler(s) you would like to trigger',
        dataSrc: 'json',
        data: {json: JSON.stringify([
          {
            name: 'before',
            title: 'Before'
          },
          {
            name: 'after',
            title: 'After'
          }
        ])},
        template: '<span>{{ item.title }}</span>',
        valueProperty: 'name',
        multiple: true
      });
    }

    if (action.access && (action.access.method === false)) {
      settingsForm.components.push({
        type: 'hidden',
        input: true,
        key: 'method'
      });
    }
    else {
      settingsForm.components.push({
        type: 'select',
        input: true,
        label: 'Method',
        key: 'method',
        placeholder: 'Trigger action on method(s)',
        dataSrc: 'json',
        data: {json: JSON.stringify([
          {
            name: 'create',
            title: 'Create'
          },
          {
            name: 'update',
            title: 'Update'
          },
          {
            name: 'read',
            title: 'Read'
          },
          {
            name: 'delete',
            title: 'Delete'
          },
          {
            name: 'index',
            title: 'Index'
          }
        ])},
        template: '<span>{{ item.title }}</span>',
        valueProperty: 'name',
        multiple: true
      });
    }

    // Create the settings form.
    var actionSettings = {
      type: 'fieldset',
      input: false,
      tree: true,
      key: 'settings',
      legend: 'Settings',
      components: []
    };

    // Add the settings form to the action settings.
    settingsForm.components.push(actionSettings);
    settingsForm.components.push({
      type: 'button',
      input: true,
      label: 'Save',
      key: 'submit',
      size: 'md',
      leftIcon: '',
      rightIcon: '',
      block: false,
      action: 'submit',
      disableOnInvalid: true,
      theme: 'primary'
    });

    // Return the settings form.
    return {
      actionSettings: actionSettings,
      settingsForm: settingsForm
    };
  };

  // Return a list of available actions.
  router.get('/form/:formId/actions', function(req, res, next) {
    var result = [];

    // Add an action to the results array.
    var addAction = function(action) {
      action.defaults = action.defaults || {};
      action.defaults = _.assign(action.defaults, {
        priority: action.priority || 0,
        name: action.name,
        title: action.title
      });

      hook.alter('actionInfo', action, req);
      result.push(action);
    };

    // Iterate through each of the available actions.
    async.eachSeries(_.values(ActionIndex.actions), function(action, callback) {
      action.info(req, res, function(err, info) {
        if (err) {
          return callback(err);
        }
        if (!info || (info.name === 'default')) {
          return callback();
        }

        addAction(info);
        callback();
      });
    }, function(err) {
      if (err) {
        return next(err);
      }

      res.json(result);
    });
  });

  // Return a list of available actions.
  router.get('/form/:formId/actions/:name', function(req, res, next) {
    if (ActionIndex.actions[req.params.name]) {
      var action = ActionIndex.actions[req.params.name];
      action.info(req, res, function(err, info) {
        if (err) {
          return next(err);
        }

        info.defaults = info.defaults || {};
        info.defaults = _.assign(info.defaults, {
          priority: info.priority || 0,
          name: info.name,
          title: info.title
        });

        var settings = getSettingsForm(action);
        action.settingsForm(req, res, function(err, settingsForm) {
          if (err) {
            return next(err);
          }

          settings.actionSettings.components = settingsForm;
          info.settingsForm = settings.settingsForm;
          info.settingsForm.action = hook.alter('url', '/form/' + req.params.formId + '/action', req);
          hook.alter('actionInfo', info, req);
          res.json(info);
        });
      });
    }
    else {
      return next('Action not found');
    }
  });

  // Before all middleware for actions.
  var actionPayload = function(req, res, next) {
    if (req.body) {
      // Translate the request body if data is provided.
      if (req.body.hasOwnProperty('data')) {
        req.body = req.body.data;
      }

      // Set the form on the request body.
      req.body.form = req.params.formId;

      // Make sure to store handler to lowercase.
      if (req.body.handler) {
        _.each(req.body.handler, function(handler, index) {
          req.body.handler[index] = handler.toLowerCase();
        });
      }

      // Make sure the method is uppercase.
      if (req.body.method) {
        _.each(req.body.method, function(method, index) {
          req.body.method[index] = method.toLowerCase();
        });
      }
    }

    req.modelQuery = req.modelQuery || this.model;
    req.countQuery = req.countQuery || this.model;
    req.modelQuery = req.modelQuery.find({form: req.params.formId}).sort('-priority');
    req.countQuery = req.countQuery.find({form: req.params.formId});
    next();
  };

  // After Index middleware for actions.
  var indexPayload = function(req, res, next) {
    res.resource.status = 200;
    _.each(res.resource.item, function(item) {
      if (ActionIndex.actions.hasOwnProperty(item.name)) {
        item = _.assign(item, ActionIndex.actions[item.name].info);
      }
    });

    next();
  };

  // Build the middleware stack.
  var handlers = {};
  var methods = ['Post', 'Get', 'Put', 'Index', 'Delete'];
  methods.forEach(function(method) {
    handlers['before' + method] = [
      router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      actionPayload
    ];
    handlers['after' + method] = [
      router.formio.middleware.filterResourcejsResponse(['deleted', '__v', 'externalTokens'])
    ];
  });

  // Add specific middleware to individual endpoints.
  handlers['beforeDelete'] = handlers['beforeDelete'].concat([router.formio.middleware.deleteActionHandler]);
  handlers['afterIndex'] = handlers['afterIndex'].concat([indexPayload]);

  /**
   * Create the REST properties using ResourceJS, as a nested resource of forms.
   *
   * Adds the endpoints:
   * [GET]    /form/:formId/action
   * [GET]    /form/:formId/action/:actionId
   * [PUT]    /form/:formId/action/:actionId
   * [POST]   /form/:formId/action/:actionId
   * [DELETE] /form/:formId/action/:actionId
   *
   * @TODO: Add `action` validation on POST/PUT with the keys inside `available`.
   */
  Resource(router, '/form/:formId', 'action', ActionIndex.model).rest(handlers);

  // Return the action index.
  return ActionIndex;
};
