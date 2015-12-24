'use strict';

var _ = require('lodash');

module.exports = function(req, router, cb) {
  var hook = require('./hook')(router.formio);

  /**
   * Create a resource Url for a swagger spec.
   * @param form
   * @returns {*}
   */
  var resourceUrl = function(form) {
    return '/' + form.path + '/submission';
  };

  /**
   * Set the body definition for a swagger spec.
   * @param form
   * @returns {undefined}
   */
  var bodyDefinition = function(form) {
    // TODO should be built from this definition
    return undefined;
  };

  /**
   * Creates and returns the swagger specification.
   * @param options
   * @returns {{swagger: string, info: {title: (string|*), description: (string|*), termsOfService: string, contact: {name: string, url: string, email: string}, license: {name: string, url: string}, version: string}, host: *, basePath: string, schemes: Array, consumes: string[], produces: string[], paths: {}, definitions: {}, securityDefinitions: {bearer: {type: string, name: string, in: string}}}}
   */
  var swaggerSpec = function(specs, options) {
    // Available Options and Defaults
    options = options || {};
    if (!options.shortTitle) {
      options.shortTitle = 'Form.io';
    }
    if (!options.title) {
      options.title = options.shortTitle + ' API';
    }
    if (!options.description) {
      options.description = options.shortTitle + ' Swagger 2.0 API specification.  This API spec can be used for integrating your Form.io project into non-HTML5 programs like "native" phone apps, "legacy" and "enterprise" systems, embedded "Internet of Things" applications (IoT), and other programming languages.  Note: The URL\'s below are configured for your specific project and form.';
    }
    if (!options.version) {
      options.version = '1.0.0';
    }
    // Requires request object
    if (!options.host) {
      options.host = router.formio.config.baseUrl;
    }
    if (!options.schemes) {
      options.schemes = [router.formio.config.protocol];
    }
    if (!options.basePath) {
      options.basePath = '/';
    }

    // Get paths and definitions
    var paths = {};
    var definitions = {};

    _.each(specs, function(spec) {
      paths = _.assign(paths, spec.paths);
      definitions = _.assign(definitions, spec.definitions);
    });

    // Return Swagger 2.0 Document Object
    return {
      swagger: '2.0',
      info: {
        title: options.title,
        description: options.description,
        termsOfService: 'http://form.io/terms/',  // TODO this is 404
        contact: {
          name: 'Form.io Support',
          url: 'http://help.form.io/',
          email: 'support@form.io'
        },
        license: {
          name: 'MIT',
          url: 'http://opensource.org/licenses/MIT'
        },
        version: options.version  // TODO:  Major versions: add/remove form.  Minor versions: add/remove field.  Patch: update field.
      },
      host: options.host,
      basePath: options.basePath,
      schemes: options.schemes,
      consumes: ['application/json'],
      produces: ['application/json'],
      paths: paths,
      definitions: definitions,
      securityDefinitions: {
        bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    };
  };

  var options = {
    host: hook.alter('host', router.formio.config.baseUrl, req)
  };

  if (typeof req.formId !== 'undefined' && req.formId !== null) {
    var form = router.formio.cache.loadCurrentForm(req, function(err, form) {
      var specs = [
        router.formio.resources.submission.swagger(
          resourceUrl(form),
          bodyDefinition(form)
        )
      ];
      cb(swaggerSpec(specs, options));
    });
  }
  else {
    var forms = router.formio.resources.form.model.find(hook.alter('formQuery', {}, req), function(err, forms) {
      if (err) {
        throw err;
      }

      var specs = [];
      forms.forEach(function(form) {
        specs.push(
          router.formio.resources.submission.swagger(
            resourceUrl(form),
            bodyDefinition(form),
            true
          )
        );
      });
      cb(swaggerSpec(specs, options));
    });
  }
};
