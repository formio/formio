`use strict`;

let async = require(`async`);
let _ = require(`lodash`);
let util = require(`../util/util`);
let pjson = require(`../../package.json`);
let semver = require(`semver`);
let debug = {
  template: require(`debug`)(`formio:template:template`),
  items: require(`debug`)(`formio:template:items`),
  install: require(`debug`)(`formio:template:install`),
  updateSchema: require(`debug`)(`formio:template:updateSchema`),
  final: require(`debug`)(`formio:template:final`),
  cleanUp: require(`debug`)(`formio:template:cleanUp`)
};

/**
 * Perform an installation of a specified template.
 *
 * @param {Object} router
 *   The express router object.
 */
module.exports = (router) => {
  let formio = router.formio;
  let hook = require(`../util/hook`)(formio);

  /**
   * A base alter used during import, if one wasn`t supplied for the entity.
   *
   * @param {Object} item
   *   The entity being altered.
   *
   * @param {Function} done
   *   The callback function to invoke, with the entity.
   */
  let baseAlter = (item, done) => done(null, item);

  /**
   * Converts an entities role id (machineName) to bson id.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Object} entity
   *   The role object to convert.
   *
   * @returns {boolean}
   *   Whether or not the conversion was successful.
   */
  let roleMachineNameToId = (template, entity) => {
    if (!entity || !template.hasOwnProperty(`roles`)) {
      return false;
    }

    if (!(entity instanceof Array)) {
      if (entity.hasOwnProperty(`role`) && template.roles.hasOwnProperty(entity.role)) {
        entity.role = template.roles[entity.role]._id.toString();
        return true;
      }

      return false;
    }

    let changes = false;

    // Used for permissions arrays.
    _.each(entity, (access) => {
      _.each(access.roles, (role, i) => {
        if (template.roles.hasOwnProperty(role)) {
          access.roles[i] = template.roles[role]._id.toString();
          changes = true;
        }
        else {
          // Remove any unknown roles, they should always be known at this point of the import.
          delete access.roles[i];
        }
      });

      // Filter any unknown roles from the pruning process.
      access.roles = _.filter(access.roles);
    });

    return changes;
  };

  /**
   * Converts an entities form id (machineName) to a bson id.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Object} entity
   *   The entity object to convert.
   *
   * @returns {boolean}
   *   Whether or not the conversion was successful.
   */
  let formMachineNameToId = (template, entity) => {
    if (!entity.hasOwnProperty(`form`)) {
      return false;
    }
    if (template.hasOwnProperty(`forms`) && template.forms.hasOwnProperty(entity.form)) {
      entity.form = template.forms[entity.form]._id.toString();
      return true;
    }
    if (template.hasOwnProperty(`resources`) && template.resources.hasOwnProperty(entity.form)) {
      entity.form = template.resources[entity.form]._id.toString();
      return true;
    }

    return false;
  };

  /**
   * Converts an entities resource id (machineName) to a bson id.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Object} entity
   *   The entity object to convert.
   *
   * @returns {boolean}
   *   Whether or not the conversion was successful.
   */
  let resourceMachineNameToId = (template, entity) => {
    // Check the template and entity for resource and resources definitions.
    if (!entity || (!(entity.resource || entity.resources) || !template.hasOwnProperty('resources'))) {
      return false;
    }

    let changes = false;

    // Attempt to update resources if present.
    if (entity.resources && template.hasOwnProperty(`resources`)) {
      _.each(entity.resources, (resource, index) => {
        if (template.resources.hasOwnProperty(resource)) {
          entity.resources[index] = template.resources[resource]._id.toString();
          changes = true;
        }
      });
    }

    // Attempt to update a single resource if present.
    if (entity.resource && template.hasOwnProperty(`resources`) && template.resources[entity.resource]) {
      entity.resource = template.resources[entity.resource]._id.toString();
      changes = true;
    }

    return changes;
  };

  /**
   * Converts any resource id (machineName) references in the form components.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Array} components
   *   The form components to scan.
   *
   * @returns {boolean}
   *   Whether or not the any changes were made.
   */
  let componentMachineNameToId = (template, components) => {
    let changed = false;
    util.eachComponent(components, (component) => {
      // Update resource machineNames for resource components.
      if ((component.type === `resource`) && resourceMachineNameToId(template, component)) {
        changed = true;
      }

      // Update resource machineNames for select components with the resource data type.
      if (
        (component.type === `select`) &&
        (component.dataSrc === `resource`) &&
        resourceMachineNameToId(template, component.data)
      ) {
        hook.alter(`importComponent`, template, components, component.data);
        changed = true;
      }

      // Allow importing of components.
      if (hook.alter(`importComponent`, template, components, component)) {
        changed = true;
      }
    });

    return changed;
  };

  /**
   * The list of installable entities. Each entity must have a model and a transform.
   *
   * Note: Entities may define a cleanUp function which is executed after the transform is complete.
   *
   * @type {*}
   */
  let entities = {
    role: {
      model: formio.resources.role.model,
      valid: (roles) => {
        if (typeof roles === 'object' && !(roles instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, role) => role
    },
    resource: {
      model: formio.resources.form.model,
      valid: (resources) => {
        if (typeof resources === 'object' && !(resources instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, resource) => {
        roleMachineNameToId(template, resource.submissionAccess);
        roleMachineNameToId(template, resource.access);
        return resource;
      },
      cleanUp: (template, resources, done) => {
        let model = formio.resources.form.model;

        async.forEachOf(resources, (resource, machineName, next) => {
          if (!componentMachineNameToId(template, resource.components)) {
            return next();
          }

          debug.cleanUp(`Need to update resource component _ids for`, machineName);
          model.findOneAndUpdate(
            {_id: resource._id, deleted: {$eq: null}},
            {components: resource.components},
            {new: true},
            (err, doc) => {
              if (err) {
                return next(err);
              }

              resources[machineName] = doc.toObject();
              debug.cleanUp(`Updated resource component _ids for`, machineName);
              next();
            }
          );
        }, done);
      }
    },
    form: {
      model: formio.resources.form.model,
      valid: (forms) => {
        if (typeof forms === 'object' && !(forms instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, form) => {
        roleMachineNameToId(template, form.submissionAccess);
        roleMachineNameToId(template, form.access);
        componentMachineNameToId(template, form.components);
        return form;
      }
    },
    action: {
      model: formio.actions.model,
      transform: (template, action) => {
        resourceMachineNameToId(template, action.settings);
        roleMachineNameToId(template, action.settings);

        // If no changes were made, the form was invalid and we can't insert the action.
        if (formMachineNameToId(template, action) === false) {
          return undefined;
        }

        return action;
      }
    },
    submission: {
      model: formio.resources.submission.model,
      transform: (template, submission) => {
        formMachineNameToId(template, submission);
        return submission;
      }
    }
  };

  /**
   * Installs the given entity.
   *
   * @param {Object} entity
   *   An entity defined in the models object.
   *
   * @returns {function()}
   *   An invokable function to install the entity with callbacks.
   */
  let install = (entity) => {
    let model = entity.model;
    let valid = entity.valid;
    let transform = entity.transform;
    let cleanUp = entity.cleanUp;

    return (template, items, alter, done) => {
      // Normalize arguments.
      if (!done) {
        done = alter;
        alter = null;
      }

      // If no items were given for the install, skip this model.
      if (!items || _.isEmpty(items)) {
        return done();
      }

      alter = alter || baseAlter;
      debug.items(items);

      // If the given items don't have a valid structure for this entity, skip the import.
      if (valid && !valid(items)) {
        return done();
      }

      async.forEachOfSeries(items, (item, machineName, next) => {
        let document = transform
          ? transform(template, item)
          : item;

        // If no document was provided before the alter, skip the insertion.
        if (!document) {
          return next();
        }

        // Set the document machineName using the import value.
        document.machineName = machineName;
        alter(document, (err, document) => {
          if (err) {
            return next(err);
          }
          // If no document was provided after the alter, skip the insertion.
          if (!document) {
            return next();
          }

          debug.install(document);
          model.findOne({machineName: document.machineName, deleted: {$eq: null}}, (err, doc) => {
            if (err) {
              debug.install(err);
              return next(err);
            }
            if (!doc) {
              debug.install(`Existing not found (${document.machineName})`);
              /* eslint-disable new-cap */
              doc = new model(document);
              /* eslint-enable new-cap */
            }
            else {
              debug.install(`Existing found`);
              doc = _.assign(doc, document);
              debug.install(doc);
            }

            doc.save((err, result) => {
              if (err) {
                debug.install(err);
                return next(err);
              }

              debug.install(result);
              items[machineName] = result.toObject();
              next();
            });
          });
        });
      }, (err) => {
        if (err) {
          return done(err);
        }
        if (cleanUp) {
          return cleanUp(template, items, done);
        }

        done();
      });
    };
  };

  /**
   * Update a template to the latest version, using the transforms.
   *
   * @param {Object} template
   * @param {Function} done
   *
   * @returns {*}
   */
  let updateSchema = (template, done) => {
    // Skip if the template has a correct version.
    debug.updateSchema(`template.version: `, template.version);
    debug.updateSchema(`pjson.templateVersion: `, pjson.templateVersion);
    if (template.version && !semver.gt(pjson.templateVersion, template.version)) {
      debug.updateSchema(`Skipping`);
      debug.updateSchema(template);
      return done();
    }

    // Create a pick method.
    let name = (name) => {
      return (value) => {
        return value.name === name;
      };
    };

    // Fix all schemas.
    _.each([`forms`, `resources`], (type) => {
      _.each(template[type], (form, formKey) => {
        // If no auth action exists, then add a save submission action.
        let authAction = _.find(template.actions, {name: `auth`, form: formKey});
        let noSubmit = _.find(template.actions, {name: `nosubmit`, form: formKey});
        if (!authAction && !noSubmit) {
          template.actions[`${formKey}Save`] = {
            title: `Save Submission`,
            name: `save`,
            form: formKey,
            handler: [`before`],
            method: [`create`, `update`],
            priority: 10,
            settings: {}
          };
        }

        util.eachComponent(form.components, (component) => {
          if (component.validate && component.validate.custom) {
            _.each(template.resources, (resource) => {
              component.validate.custom = component.validate.custom.replace(`${resource.name}.password`, `password`);
            });
          }
          if (component.key && component.key.indexOf(`.`) !== -1) {
            component.key = component.key.split(`.`)[1];
          }
        });
      });
    });

    // Turn all `auth` actions into the new authentication system.
    _.each(_.pick(template.actions, name(`auth`)), (authAction, key) => {
      delete template.actions[key];
      let userparts = authAction.settings.username.split(`.`);
      if (userparts.length <= 1) {
        return;
      }

      let resource = userparts[0];
      let username = userparts[1];
      let password = authAction.settings.password.split(`.`)[1];

      // Add the Resource action for new associations.
      if (authAction.settings.association === `new`) {
        // Ensure that the underlying resource has a role assignment action.
        let roleAction = _.find(template.actions, {name: `role`, form: resource});
        if (!roleAction) {
          template.actions[`${resource}Role`] = {
            title: `Role Assignment`,
            name: `role`,
            priority: 1,
            handler: [`after`],
            method: [`create`],
            form: resource,
            settings: {
              association: `new`,
              type: `add`,
              role: authAction.settings.role
            }
          };
        }

        let fields = {};
        fields[username] = username;
        fields[password] = password;
        template.actions[`${key}SaveResource`] = {
          title: `Save Submission`,
          name: `save`,
          form: authAction.form,
          handler: [`before`],
          method: [`create`, `update`],
          priority: 11,
          settings: {
            resource: resource,
            fields: fields
          }
        };
      }

      // Add the login action.
      template.actions[`${key}Login`] = {
        title: `Login`,
        name: `login`,
        form: authAction.form,
        handler: [`before`],
        method: [`create`],
        priority: 2,
        settings: {
          resources: [resource],
          username: username,
          password: password
        }
      };
    });

    // Remove all nosubmit actions.
    _.each(_.pick(template.actions, name(`nosubmit`)), (action, key) => {
      delete template.actions[key];
    });

    // Convert resource actions into Save Submission actions with resource association.
    _.each(_.pick(template.actions, name(`resource`)), (resourceAction, key) => {
      delete template.actions[key];

      let roleAction = _.find(template.actions, {name: `role`, form: resourceAction.settings.resource});
      if (!roleAction) {
        template.actions[`${resourceAction.settings.resource}Role`] = {
          title: `Role Assignment`,
          name: `role`,
          priority: 1,
          handler: [`after`],
          method: [`create`],
          form: resourceAction.settings.resource,
          settings: {
            association: `new`,
            type: `add`,
            role: resourceAction.settings.role
          }
        };
      }

      template.actions[`${key}SaveResource`] = {
        title: `Save Submission`,
        name: `save`,
        form: resourceAction.form,
        handler: [`before`],
        method: [`create`, `update`],
        priority: 11,
        settings: {
          resource: resourceAction.settings.resource,
          fields: resourceAction.settings.fields
        }
      };
    });

    done();
  };

  /**
   * Import the formio template.
   *
   * Note: This is all of the core entities, not submission data.
   *
   * @param {Object} template
   *   The parsed JSON template to import.
   * @param {Object} alter
   *   A map of alter functions.
   * @param {Function} done
   *   The callback function to invoke after the import is complete.
   *
   * @returns {*}
   */
  let importTemplate = (template, alter, done) => {
    if (!done) {
      done = alter;
      alter = null;
    }
    alter = alter || {};
    if (!template) {
      return done(`No template provided.`);
    }

    debug.items(JSON.stringify(template));
    async.series([
      async.apply(updateSchema, template),
      async.apply(install(entities.role), template, template.roles, alter.role),
      async.apply(install(entities.resource), template, template.resources, alter.form),
      async.apply(install(entities.form), template, template.forms, alter.form),
      async.apply(install(entities.action), template, template.actions, alter.action),
      async.apply(install(entities.submission), template, template.submissions, alter.submission)
    ], (err) => {
      if (err) {
        debug.template(err);
        return done(err);
      }

      debug.final(JSON.stringify(template));
      done(null, template);
    });
  };
  
  return importTemplate;
};
