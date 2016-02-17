'use strict';

var async = require('async');
var _ = require('lodash');
var util = require('../util/util');
var pjson = require('../../package.json');
var semver = require('semver');
var debug = {
  template: require('debug')('formio:template:template'),
  _install: require('debug')('formio:template:_install'),
  postResourceInstall: require('debug')('formio:template:postResourceInstall')
};

/**
 * Perform an installation of a specified template.
 *
 * @param formio
 *   The formio object.
 */
module.exports = function(formio) {
  // Provide a default alter method.
  var _alter = function(item, done) {
    done(null, item);
  };

  // Assign the role ids.
  var assignRoles = function(template, perms) {
    _.each(perms, function(access) {
      _.each(access.roles, function(role, i) {
        if (template.roles.hasOwnProperty(role)) {
          access.roles[i] = template.roles[role]._id.toString();
        }
      });
    });
  };

  // Assign the role to an entity.
  var assignRole = function(template, entity) {
    if (!entity) {
      return false;
    }
    if (entity.hasOwnProperty('role') && template.roles.hasOwnProperty(entity.role)) {
      entity.role = template.roles[entity.role]._id.toString();
      return true;
    }
    return false;
  };

  // Assign form.
  var assignForm = function(template, entity) {
    if (entity.hasOwnProperty('form')) {
      if (template.forms.hasOwnProperty(entity.form)) {
        entity.form = template.forms[entity.form]._id.toString();
        return true;
      }
      if (template.resources.hasOwnProperty(entity.form)) {
        entity.form = template.resources[entity.form]._id.toString();
        return true;
      }
    }
    return false;
  };

  // Assign resources.
  var assignResources = function(template, entity) {
    if (!entity) {
      return false;
    }
    _.each(entity.resources, function(resource, index) {
      if (template.resources.hasOwnProperty(resource)) {
        entity.resources[index] = template.resources[resource]._id.toString();
      }
    });
  };

  // Assign resource.
  var assignResource = function(template, entity) {
    if (!entity) {
      return false;
    }
    if (entity.hasOwnProperty('resource')) {
      if (template.resources.hasOwnProperty(entity.resource)) {
        entity.resource = template.resources[entity.resource]._id.toString();
        return true;
      }
    }
    return false;
  };

  // Assign resources within a form.
  var assignComponentResources = function(template, components) {
    var changed = false;
    util.eachComponent(components, function(component) {
      if ((component.type === 'resource') && assignResource(template, component)) {
        changed = true;
      }
    });
    return changed;
  };

  /**
   * Methods to fill in all necessary ID's.
   * @type {{role}}
   */
  var parse = {
    role: function(template, role) {
      return role;
    },
    resource: function(template, form) {
      assignRoles(template, form.submissionAccess);
      assignRoles(template, form.access);
      return form;
    },
    form: function(template, form) {
      assignRoles(template, form.submissionAccess);
      assignRoles(template, form.access);
      assignComponentResources(template, form.components);
      return form;
    },
    action: function(template, action) {
      assignForm(template, action);
      assignResource(template, action.settings);
      assignResources(template, action.settings);
      assignRole(template, action.settings);
      return action;
    },
    submission: function(template, submission) {
      assignForm(template, submission);
      return submission;
    }
  };

  var postResourceInstall = function(model, template, items, done) {
    async.forEachOf(items, function(item, name, itemDone) {
      if (!assignComponentResources(template, item.components)) {
        return itemDone();
      }

      debug.postResourceInstall('Need to update resource component _ids for', name);

      model.findOneAndUpdate(
        {_id: item._id},
        {components: item.components},
        {new: true},
        function(err, doc) {
          if (err) {
            return itemDone(err);
          }
          items[name] = doc.toObject();
          debug.postResourceInstall('Updated resource component _ids for', name);
          itemDone();
        }
      );
    }, done);
  };

  // Install a model with a parse method.
  var _install = function(model, _parse, _postInstall) {
    return function(template, items, alter, done) {
      if (!items || _.isEmpty(items)) {
        return done();
      }

      // Normalize arguments.
      if (!done) {
        done = alter;
        alter = null;
      }
      alter = alter || _alter;
      async.forEachOfSeries(items, function(item, name, itemDone) {
        var document = _parse ? _parse(template, item) : item;
        document.machineName = name;
        alter(document, function(err, document) {
          if (err) {
            return itemDone(err);
          }

          debug._install(document);
          model.findOne({machineName: document.machineName}, function(err, doc) {
            if (err) {
              debug._install(err);
              return itemDone(err);
            }
            if (!doc) {
              debug._install('Existing not found');
              /* eslint-disable new-cap */
              doc = new model(document);
              /* eslint-enable new-cap */
            }
            else {
              debug._install('Existing found');
              doc = _.assign(doc, document);
              debug._install(doc);
            }

            doc.save(function(err, result) {
              if (err) {
                debug._install(err);
                return itemDone(err);
              }

              debug._install(result);
              items[name] = result.toObject();
              itemDone();
            });
          });
        });
      }, function(err) {
        if (err) {
          return done(err);
        }
        else if (_postInstall) {
          _postInstall(model, template, items, done);
        }
        else {
          done();
        }
      });
    };
  };

  /**
   * Translate a schema from older versions to newer versions.
   * @param template
   * @param done
   */
  var translateSchema = function(template, done) {
    // Skip if the template has a correct version.
    if (template.version && !semver.gt(pjson.templateVersion, template.version)) {
      return done();
    }

    // Clone the template so we can modify the original without messing up the iterations.
    var clone = _.cloneDeep(template);

    // Fix all schemas.
    _.each(['forms', 'resources'], function(type) {
      _.each(template[type], function(form) {
        util.eachComponent(form.components, function(component) {
          if (component.validate && component.validate.custom) {
            _.each(template.resources, function(resource) {
              component.validate.custom = component.validate.custom.replace(resource.name + '.password', 'password');
            });
          }
          if (component.key.indexOf('.') !== -1) {
            component.key = component.key.split('.')[1];
          }
        });
      });
    });

    // Turn all "auth" actions into the new authentication system.
    _.each(clone.actions, function(action, key) {
      if (action.name === 'auth') {
        var userparts = action.settings.username.split('.');
        if (userparts.length > 1) {
          var resource = userparts[0];
          var username = userparts[1];
          var password = action.settings.password.split('.')[1];

          // Add the Resource action for new associations.
          if (action.settings.association === 'new') {
            var fields = {};
            fields[username] = username;
            fields[password] = password;
            template.actions[key + 'Resource'] = {
              title: 'Submit to another Resource',
              name: 'resource',
              form: action.form,
              handler: ['before'],
              method: ['create'],
              priority: 10,
              settings: {
                resource: resource,
                role: action.settings.role,
                fields: fields
              }
            };
          }

          // Add the login action.
          template.actions[key + 'Login'] = {
            title: 'Login',
            name: 'login',
            form: action.form,
            handler: ['before'],
            method: ['create'],
            priority: 2,
            settings: {
              resources: [resource],
              username: username,
              password: password
            }
          };

          // Add the skip form submission action.
          template.actions[key + 'NoSubmit'] = {
            title: 'Skip Form Submission',
            name: 'nosubmit',
            form: action.form,
            handler: ['before'],
            method: ['create'],
            priority: 0,
            settings: {}
          };

          // Remove the auth action.
          delete template.actions[key];
        }
      }
    });

    done();
  };

  /**
   * Return an easy way for someone to install a template.
   */
  return {
    createInstall: _install,
    parse: parse,
    roles: _install(formio.resources.role.model, parse.role),
    resources: _install(formio.resources.form.model, parse.resource, postResourceInstall),
    forms: _install(formio.resources.form.model, parse.form),
    actions: _install(formio.actions.model, parse.action),
    submissions: _install(formio.resources.submission.model, parse.submission),
    template: function(template, alter, done) {
      if (!done) {
        done = alter;
        alter = null;
      }
      alter = alter || {};
      async.series([
        async.apply(translateSchema, template),
        async.apply(this.roles, template, template.roles, alter.role),
        async.apply(this.resources, template, template.resources, alter.form),
        async.apply(this.forms, template, template.forms, alter.form),
        async.apply(this.actions, template, template.actions, alter.action),
        async.apply(this.submissions, template, template.submissions, alter.submission)
      ], function(err) {
        if (err) {
          debug.template(err);
          return done(err);
        }

        done(null, template);
      });
    }
  };
};
