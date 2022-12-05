'use strict';

const _ = require('lodash');
const util = require('../util/util');
const debug = {
  error: require('debug')('formio:error')
};

module.exports = function(req, router, cb) {
  const hook = require('./hook')(router.formio);

  /**
   * Create a resource Url for a swagger spec.
   * @param form
   * @returns {*}
   */
  const resourceUrl = function(form) {
    return `/${form.path}/submission`;
  };

  /*eslint-disable camelcase*/
  const addressComponent = function() {
    return {
      address: {
        properties: {
          address_components: {
            type: 'array',
            items: {
              $ref: '#/definitions/address_components'
            }
          },
          formatted_address: {
            type: 'string'
          },
          geometry: {
            $ref: '#/definitions/address_geometry'
          },
          place_id: {
            type: 'string'
          },
          types: {
            type: 'array',
              items: {
              type: 'string'
            }
          }
        }
      },
      address_components: {
        properties: {
          long_name: {
            type: 'string'
          },
          short_name: {
            type: 'string'
          },
          types: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        }
      },
      location: {
        properties: {
          lat: {
            type: 'number',
            format: 'float'
          },
          lng: {
            type: 'number',
            format: 'float'
          }
        }
      },
      viewport: {
        properties: {
          northeast: {
            $ref: '#/definitions/location'
          },
          southwest: {
            $ref: '#/definitions/location'
          }
        }
      },
      address_geometry: {
        properties: {
          location: {
            $ref: '#/definitions/location'
          },
          location_type: {
            type: 'string'
          },
          viewport: {
            $ref: '#/definitions/viewport'
          }
        }
      }
    };
  };
  /*eslint-enable camelcase*/

  /**
   * Set the body definition for a swagger spec.
   * @param form
   * @returns {undefined}
   */
  const getDefinition = function(components, name) {
    let definitions = {};
    definitions[name] = {
      properties: {},
      required: []
    };

    util.FormioUtils.eachComponent(components, function(component) {
      if (component.key) {
        let property;
        switch (component.type) {
          case 'email':
          case 'textfield':
          case 'password':
          case 'phonenumber':
          case 'select':
          case 'radio':
          case 'textarea':
            property = {
              type: 'string'
            };
            break;
          case 'number':
            property = {
              type: 'integer',
              format: 'int64'
            };
            break;
          case 'datetime':
            property = {
              type: 'string',
              format: 'date'
            };
            break;
          case 'address':
            property = {
              $ref: '#/definitions/address'
            };
            definitions = _.merge(definitions, addressComponent());
            break;
          case 'checkbox':
            property = {
              type: 'boolean'
            };
            break;
          case 'selectboxes':
            property = {
              type: 'array',
              items: {
                type: 'string'
              }
            };
            break;
          case 'resource':
            property = {
              'type': 'string',
              'description': 'ObjectId'
            };
            break;
          case 'datagrid':
            //TODO: finish datagrid swagger def.
            break;
          case 'custom':
            property = {
              type: 'object'
            };
            break;
          case 'button':
            property = false;
            break;
          default:
            property = {
              type: 'object'
            };
        }
        if (property) {
          if (component.multiple) {
            property = {
              type: 'array',
              items: property
            };
          }
          definitions[name].properties[component.key] = property;
        }
        if (component.validate && component.validate.required) {
          definitions[name].required.push(component.key);
        }
      }
    });

    return definitions;
  };

  const submissionSwagger = function(form) {
    // Need to customize per form instead of returning the same swagger for every form.
    const submissionModel = req.submissionModel || router.formio.resources.submission.model;
    const originalPaths = _.cloneDeep(submissionModel.schema.paths);
    const resource = {
      name: form.title,
      modelName: form.name,
      route: resourceUrl(form),
      model: {
        schema: {
          paths: _.omit(originalPaths, ['deleted', '__v', 'machineName'])
        }
      },
      methods: _.clone(router.formio.resources.submission.methods)
    };

    let swagger = {};
    try {
      swagger = router.formio.resources.submission.swagger.call(resource, true);
    }
    catch (err) {
      debug.error(err);
    }

    // Override the body definition.
    if (swagger.definitions) {
      swagger.definitions[resource.modelName].required = ['data'];
      swagger.definitions[resource.modelName].properties.data = {
        $ref: `#/definitions/${resource.modelName}Data`
      };
      swagger.definitions = _.merge(swagger.definitions, getDefinition(form.components, `${resource.modelName}Data`));
    }
    return swagger;
  };

  /**
   * Creates and returns the swagger specification.
   * @param options
   * @returns {{swagger: string, info: {title: (string|*), description: (string|*), termsOfService: string, contact: {name: string, url: string, email: string}, license: {name: string, url: string}, version: string}, host: *, basePath: string, schemes: Array, consumes: string[], produces: string[], paths: {}, definitions: {}, securityDefinitions: {bearer: {type: string, name: string, in: string}}}}
   */
  const swaggerSpec = function(specs, options) {
    // Available Options and Defaults
    options = options || {};
    if (!options.shortTitle) {
      options.shortTitle = 'Form.io';
    }
    if (!options.title) {
      options.title = `${options.shortTitle} API`;
    }
    if (!options.description) {
      options.description = `${options.shortTitle} Swagger 2.0 API specification.  This API spec can be used for `
        + `integrating your Form.io project into non-HTML5 programs like "native" phone apps, "legacy" and "enterprise"`
        + ` systems, embedded "Internet of Things" applications (IoT), and other programming languages.  Note: `
        + `The URL's below are configured for your specific project and form.`;
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
    let paths = {};
    let definitions = {};

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
        termsOfService: 'http://blog.form.io/form-terms-of-use',
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

  const options = {
    host: hook.alter('host', router.formio.config.baseUrl, req)
  };

  if (typeof req.formId !== 'undefined' && req.formId !== null) {
    router.formio.cache.loadCurrentForm(req, function(err, form) {
      if (err) {
        throw err;
      }

      const specs = [];
      specs.push(submissionSwagger(form));
      cb(swaggerSpec(specs, options));
    });
  }
  else {
    router.formio.resources.form.model.find(hook.alter('formQuery', {deleted: {$eq: null}}, req))
      .lean()
      .exec((err, forms) => {
        if (err) {
          throw err;
        }

        const specs = [];
        forms.forEach(function(form) {
          specs.push(submissionSwagger(form));
        });
        cb(swaggerSpec(specs, options));
      });
  }
};
