'use strict';

// Setup the Form.IO server.
var express = require('express');
var cors = require('cors');
var router = express.Router();
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var _ = require('lodash');
var events = require('events');
var Q = require('q');
var nunjucks = require('nunjucks');
var util = require('./src/util/util');
// Keep track of the formio interface.
router.formio = {};

// Use custom template delimiters.
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

// Allow custom configurations passed to the Form.IO server.
module.exports = function(config) {
  // Give app a reference to our config.
  router.formio.config = config;

  // Add the middleware.
  router.formio.middleware = require('./src/middleware/middleware')(router);

  // Configure nunjucks to not watch any files
  nunjucks.configure([], {
    watch: false
  });

  // Allow events to be triggered.
  router.formio.events = new events.EventEmitter();
  router.formio.config.schema = require('./package.json').schema;

  /**
   * Initialize the formio server.
   */
  router.init = function(hooks) {
    var deferred = Q.defer();

    // Hooks system during boot.
    router.formio.hooks = hooks;

    // Add the utils to the formio object.
    router.formio.util = util;

    // Get the hook system.
    router.formio.hook = require('./src/util/hook')(router.formio);

    // Get the encryption system.
    router.formio.encrypt = require('./src/util/encrypt');

    // Load the updates and attach them to the router.
    router.formio.update = require('./src/db/index')(router.formio);

    // Run the healthCheck sanity check on /health
    /* eslint-disable max-statements */
    router.formio.update.initialize(function(err, db) {
      // If an error occurred, then reject the initialization.
      if (err) {
        return deferred.reject(err);
      }

      util.log('Initializing API Server.');

      // Add the database connection to the router.
      router.formio.db = db;

      // Establish our url alias middleware.
      if (!router.formio.hook.invoke('init', 'alias', router.formio)) {
        router.use(router.formio.middleware.alias);
      }

      // Establish the parameters.
      if (!router.formio.hook.invoke('init', 'params', router.formio)) {
        router.use(router.formio.middleware.params);
      }

      // Add the db schema sanity check to each request.
      router.use(router.formio.update.sanityCheck);

      // Add Middleware necessary for REST API's
      router.use(bodyParser.urlencoded({extended: true}));
      router.use(bodyParser.json({
        limit: '16mb'
      }));
      router.use(methodOverride('X-HTTP-Method-Override'));

      // Error handler for malformed JSON
      router.use(function(err, req, res, next) {
        if (err instanceof SyntaxError) {
          res.status(400).send(err.message);
        }

        next();
      });

      // CORS Support
      var corsRoute = cors(router.formio.hook.alter('cors'));
      router.use(function(req, res, next) {
        if (req.url === '/') {
          return next();
        }

        if (res.headersSent) {
          return next();
        }

        corsRoute(req, res, next);
      });

      // Import our authentication models.
      router.formio.auth = require('./src/authentication/index')(router);

      // Perform token mutation before all requests.
      if (!router.formio.hook.invoke('init', 'token', router.formio)) {
        router.use(router.formio.middleware.tokenHandler);
      }

      // The get token handler
      if (!router.formio.hook.invoke('init', 'getTempToken', router.formio)) {
        router.get('/token', router.formio.auth.tempToken);
      }

      // The current user handler.
      if (!router.formio.hook.invoke('init', 'logout', router.formio)) {
        router.get('/logout', router.formio.auth.logout);
      }

      // The current user handler.
      if (!router.formio.hook.invoke('init', 'current', router.formio)) {
        router.get('/current', router.formio.auth.currentUser);
      }

      // The access handler.
      if (!router.formio.hook.invoke('init', 'access', router.formio)) {
        router.get('/access', router.formio.middleware.accessHandler);
      }

      // Authorize all urls based on roles and permissions.
      if (!router.formio.hook.invoke('init', 'perms', router.formio)) {
        router.use(router.formio.middleware.permissionHandler);
      }

      // Allow libraries to use a single instance of mongoose.
      router.formio.mongoose = mongoose;

      let mongoUrl = config.mongo;
      const mongoOptions = {
        keepAlive: 120,
        useMongoClient: true
      };

      if (process.env.MONGO_HIGH_AVAILABILITY) {
        mongoOptions.mongos = true;
      }

      if (_.isArray(config.mongo)) {
        mongoUrl = config.mongo.join(',');
        mongoOptions.mongos = true;
      }

      // Connect to MongoDB.
      mongoose.connect(mongoUrl, mongoOptions);

      // Trigger when the connection is made.
      mongoose.connection.on('error', function(err) {
        util.log(err.message);
        deferred.reject(err.message);
      });

      // Called when the connection is made.
      mongoose.connection.once('open', function() {
        util.log(' > Mongo connection established.');

        // Load the BaseModel.
        router.formio.BaseModel = require('./src/models/BaseModel');

        // Load the plugins.
        router.formio.plugins = require('./src/plugins/plugins');

        router.formio.schemas = {
          PermissionSchema: require('./src/models/PermissionSchema')(router.formio),
          AccessSchema: require('./src/models/AccessSchema')(router.formio)
        };

        // Get the models for our project.
        var models = require('./src/models/models')(router);

        // Load the Schemas.
        router.formio.schemas = _.assign(router.formio.schemas, models.schemas);

        // Load the Models.
        router.formio.models = models.models;

        // Load the Resources.
        router.formio.resources = require('./src/resources/resources')(router);

        // Load the request cache
        router.formio.cache = require('./src/cache/cache')(router);

        // Return the form components.
        router.get('/form/:formId/components', function(req, res, next) {
          router.formio.resources.form.model.findOne({_id: req.params.formId}, function(err, form) {
            if (err) {
              return next(err);
            }

            if (!form) {
              return res.status(404).send('Form not found');
            }
            // If query params present, filter components that match params
            var filter = Object.keys(req.query).length !== 0 ? _.omit(req.query, ['limit', 'skip']) : null;
            res.json(
              _(util.flattenComponents(form.components))
              .filter(function(component) {
                if (!filter) {
                  return true;
                }
                return _.reduce(filter, function(prev, value, prop) {
                  if (!value) {
                    return prev && _.has(component, prop);
                  }
                  var actualValue = _.property(prop)(component);
                  // loose equality so number values can match
                  return prev && actualValue == value || // eslint-disable-line eqeqeq
                    value === 'true' && actualValue === true ||
                    value === 'false' && actualValue === false;
                }, true);
              })
              .values()
              .value()
            );
          });
        });

        // Import the form actions.
        router.formio.Action = router.formio.models.action;
        router.formio.actions = require('./src/actions/actions')(router);

        // Add submission data export capabilities.
        require('./src/export/export')(router);

        // Add the available templates.
        router.formio.templates = {
          default: _.cloneDeep(require('./src/templates/default.json')),
          empty: _.cloneDeep(require('./src/templates/empty.json'))
        };

        // Add the template functions.
        router.formio.template = require('./src/templates/index')(router);

        var swagger = require('./src/util/swagger');
        // Show the swagger for the whole site.
        router.get('/spec.json', function(req, res, next) {
          swagger(req, router, function(spec) {
            res.json(spec);
          });
        });

        // Show the swagger for specific forms.
        router.get('/form/:formId/spec.json', function(req, res, next) {
          swagger(req, router, function(spec) {
            res.json(spec);
          });
        });

        // Say we are done.
        deferred.resolve(router.formio);
      });
    });
    /* eslint-enable max-statements */

    return deferred.promise;
  };

  // Return the router.
  return router;
};
