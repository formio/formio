'use strict';

var Resource = require('resourcejs');
var async = require('async');
var mongoose = require('mongoose');
var _ = require('lodash');

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
      email: require('./EmailAction')(router),
      webhook: require('./WebhookAction')(router),
      sql: require('./SQLAction')(router),
      role: require('./RoleAction')(router),
      resetpass: require('./ResetPassword')(router),
      save: require('./SaveSubmission')(router),
      login: require('./LoginAction')(router)
    }),

    /**
     * The model to use for each Action.
     */
    model: mongoose.model('action', hook.alter('actionSchema', Action.schema)),

    /**
     * Load all actions for a provided form.
     *
     * @param req
     * @param next
     * @returns {*}
     */
    loadActions: function(req, res, next) {
      if (!req.actions) {
        req.actions = {};
      }

      var form = req.formId;
      if (!form) {
        return next();
      }

      // Use cache if it is available.
      if (req.actions && req.actions[form]) {
        return next(null, req.actions[form]);
      }

      // Find the actions associated with this form.
      this.model.find({
        form: form,
        deleted: {$eq: null}
      })
      .sort('-priority')
      .exec(function(err, result) {
        if (err) {
          return next(err);
        }

        // Iterate through all of the actions and load them.
        var actions = [];
        _.each(result, function(action) {
          if (!this.actions.hasOwnProperty(action.name)) {
            return;
          }

          // Create the action class.
          var ActionClass = this.actions[action.name];
          actions.push(new ActionClass(action, req, res));
        }.bind(this));

        req.actions[form] = actions;
        return next(null, actions);
      }.bind(this));
    },

    /**
     * Find an action within the available actions for this form.
     *
     * @param handler
     * @param method
     * @param req
     * @param next
     */
    search: function(handler, method, req, res, next) {
      if (!req.formId) {
        return next(null, []);
      }

      // Make sure we have actions attached to the request.
      if (req.actions) {
        var actions = [];
        _.each(req.actions[req.formId], function(action) {
          if (
            (!handler || action.handler.indexOf(handler) !== -1) &&
            (!method || action.method.indexOf(method) !== -1)
          ) {
            actions.push(action);
          }
        });
        return next(null, actions);
      }
      else {
        // Load the actions.
        this.loadActions(req, res, function(err) {
          if (err) {
            return next(err);
          }
          this.search(handler, method, req, res, next);
        }.bind(this));
      }
    },

    /**
     * Load an initialize all actions for this form.
     *
     * @param req
     * @param res
     * @param next
     */
    initialize: function(method, req, res, next) {
      this.search(null, method, req, res, function(err, actions) {
        if (err) {
          return next(err);
        }

        // Iterate through each action.
        async.forEachOf(actions, function(action, index, done) {
          if (actions[index].initialize) {
            actions[index].initialize(req, res, done);
          }
          else {
            done();
          }
        }.bind(this), next);
      }.bind(this));
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
      // Find the available actions.
      this.search(handler, method, req, res, function(err, actions) {
        if (err) {
          return next(err);
        }

        // Iterate and execute each action.
        async.eachSeries(actions, function(action, cb) {
          // See if a condition is not established within the action.
          if (
            action.condition &&
            action.condition.field &&
            (action.condition.eq === 'equals') &&
            (req.body.data[action.condition.field] !== action.condition.value)
          ) {
            return cb();
          }

          // Resolve the action.
          action.resolve(handler, method, req, res, cb);
        }, function(err) {
          if (err) {
            return next(err);
          }

          next();
        });
      });
    }
  };

  /**
   * Get the settings form for each action.
   *
   * @param action
   */
  var getSettingsForm = function(action, req) {
    var basePath = hook.alter('url', '/form', req);
    var dataSrc = basePath + '/' + req.params.formId + '/components';
    // The default settings form.
    var settingsForm = {
      components: [
        {type: 'hidden', input: true, key: 'priority'},
        {type: 'hidden', input: true, key: 'name'},
        {type: 'hidden', input: true, key: 'title'}
      ]
    };

    var mainSettings = {
      components: []
    };
    var conditionalSettings = {
      components: []
    };

    var configSettings = {
      type: 'fieldset',
      input: false,
      tree: false,
      key: 'conditions',
      legend: 'Action Conditions',
      components: [
        {
          input: false,
          type: 'columns',
          columns: [
            mainSettings,
            conditionalSettings
          ]
        }
      ]
    };

    // If the defaults are read only.
    if (action.access && (action.access.handler === false)) {
      mainSettings.components.push({
        type: 'hidden',
        input: true,
        key: 'handler'
      });
    }
    else {
      mainSettings.components.push({
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
      mainSettings.components.push({
        type: 'hidden',
        input: true,
        key: 'method'
      });
    }
    else {
      mainSettings.components.push({
        type: 'select',
        input: true,
        label: 'Methods',
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

    conditionalSettings.components.push({
      type: 'fieldset',
      input: false,
      tree: true,
      key: 'condition',
      components: [
        {
          type: 'select',
          input: true,
          label: '(optional) Trigger this action only if field',
          key: 'condition[field]',
          placeholder: 'Select the conditional field',
          template: '<span>{{ item.label || item.key }}</span>',
          dataSrc: 'url',
          data: {url: dataSrc},
          valueProperty: 'key',
          multiple: false,
          validate: {}
        },
        {
          type : 'select',
          input : true,
          label : '',
          key : 'condition[eq]',
          placeholder : 'Select comparison',
          template : '<span>{{ item.label }}</span>',
          dataSrc : 'values',
          data : {
            values : [
              {
                value : 'equals',
                label : 'Equals'
              },
              {
                value : 'notEqual',
                label : 'Does Not Equal'
              }
            ],
            json : '',
            url : '',
            resource : ''
          },
          valueProperty : 'value',
          multiple : false
        },
        {
          input: true,
          type: 'textfield',
          inputType: 'text',
          key: 'condition[value]',
          placeholder: 'Enter value',
          multiple: false
        }
      ]
    });

    settingsForm.components.push(configSettings);

    // Create the settings form.
    var actionSettings = {
      type: 'fieldset',
      input: false,
      tree: true,
      key: 'settings',
      legend: 'Action Settings',
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

        var settings = getSettingsForm(action, req);
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
