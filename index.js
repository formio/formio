'use strict';

// Setup the Form.IO server.
var express = require('express');
var cors = require('cors');
var router = express.Router();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var _ = require('lodash');
var _property = require('lodash.property');
var _has = require('lodash.has');
var events = require('events');
var fs = require('fs');
var Q = require('q');
var nunjucks = require('nunjucks');
var util = require('./src/util/util');

// Keep track of the formio interface.
router.formio = {};

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

  // Load the updates and attach them to the router.
  router.formio.update = require('./src/db/index')(router.formio.config);

  /**
   * Initialize the formio server.
   */
  router.init = function(hooks) {
    var deferred = Q.defer();

    // Hooks system during boot.
    router.formio.hooks = hooks;

    // Add the utils to the formio object.
    router.formio.util = util;

    // Get the hook sytem.
    router.formio.hook = require('./src/util/hook')(router.formio);

    // Get the encryption system.
    router.formio.encrypt = require('./src/util/encrypt');

    // Run the healthCheck sanity check on /health
    router.formio.update.initialize(function(err, db) {

      // If an error occured, then reject the initialization.
      if (err) {
        return deferred.reject(err);
      }

      console.log('Initializing API Server.');

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
      router.use(bodyParser.json());
      router.use(methodOverride('X-HTTP-Method-Override'));

      // Error handler for malformed JSON
      router.use(function(err, req, res, next) {
        if (err instanceof SyntaxError) {
          res.status(400).send(err.message);
        }
        else {
          next();
        }
      });

      // CORS Support
      var corsRoute = cors(router.formio.hook.alter('cors'));
      router.use(function(req, res, next) {
        if (req.url === '/') {
          next();
        }
        else {
          corsRoute(req, res, next);
        }
      });

      // Import our authentication models.
      router.formio.auth = require('./src/authentication/index')(router);

      // Perform token mutation before all requests.
      if (!router.formio.hook.invoke('init', 'token', router.formio)) {
        router.use(router.formio.middleware.tokenHandler);
      }

      // The current user handler.
      if (!router.formio.hook.invoke('init', 'logout', router.formio)) {
        router.get('/logout', router.formio.auth.logout);
      }

      // The current user handler.
      if (!router.formio.hook.invoke('init', 'current', router.formio)) {
        router.get('/current', router.formio.auth.currentUser);
      }

      // Authorize all urls based on roles and permissions.
      if (!router.formio.hook.invoke('init', 'perms', router.formio)) {
        router.use(router.formio.middleware.permissionHandler);
      }

      // Allow libraries to use a single instance of mongoose.
      router.formio.mongoose = mongoose;

      // See if our mongo configuration is a string.
      if (typeof config.mongo === 'string') {
        // Connect to a single mongo instance.
        mongoose.connect(config.mongo);
      }
      else {
        // Connect to multiple mongo instance replica sets with High availability.
        mongoose.connect(config.mongo.join(','), {mongos: true});
      }

      // Trigger when the connection is made.
      mongoose.connection.on('error', function(err) {
        console.log(err.message);
        deferred.reject(err.message);
      });

      // Called when the connection is made.
      mongoose.connection.once('open', function() {
        console.log(' > Mongo connection established.');

        // Load the BaseModel.
        router.formio.BaseModel = require('./src/models/BaseModel');

        // Load the plugins.
        router.formio.plugins = require('./src/plugins/plugins');

        router.formio.schemas = {
          PermissionSchema: require('./src/models/PermissionSchema')
        };

        // Get the models for our project.
        var models = require('./src/models/models')(router);

        // Load the Models.
        router.formio.schemas = _.assign(router.formio.schemas, models.schemas);

        // Load the Resources.
        router.formio.resources = require('./src/resources/resources')(router);

        // Register the roles and permission checks.
        router.formio.roles = require('./src/roles/index')(router);

        // Load the request cache
        router.formio.cache = require('./src/cache/cache')(router);

        // Add export capabilities.
        require('./src/export/export')(router);

        // Allow exporting capabilities.
        router.formio.exporter = require('./src/templates/export')(router.formio);
        router.get('/export', function(req, res, next) {
          var exportOptions = router.formio.hook.alter('exportOptions', {}, req, res);
          router.formio.exporter.export(exportOptions, function(err, _export) {
            res.attachment(exportOptions.name + '.json');
            res.end(JSON.stringify(_export));
          });
        });

        // Return the form components.
        router.get('/form/:formId/components', function(req, res, next) {
          router.formio.resources.form.model.findOne({_id: req.params.formId}, function (err, form) {
            if (err) {
              return next(err);
            }

            if (!form) {
              return res.status(404).send('Form not found');
            }
            // If query params present, filter components that match params
            var filter = Object.keys(req.query).length !== 0 ? req.query : null;
            res.json(
              _(util.flattenComponents(form.components))
              .filter(function(component) {
                if (!filter) {
                  return true;
                }
                return _.reduce(filter, function(prev, value, prop) {
                  if (!value) {
                    return prev && _has(component, prop);
                  }
                  var actualValue = _property(prop)(component);
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

        // Import the OAuth providers
        router.formio.oauth = require('./src/oauth/oauth')(router);

        // Import the form actions.
        router.formio.Action = require('./src/actions/Action');
        router.formio.actions = require('./src/actions/actions')(router);

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

        // Add the templates.
        router.formio.templates = require('./src/templates/index');

        // Add the importer.
        router.formio.import = require('./src/templates/import')(router.formio);

        // Say we are done.
        deferred.resolve(router.formio);
      });
    });

    return deferred.promise;
  };

  // Return the router.
  return router;
};
