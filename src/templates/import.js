'use strict';

let async = require(`async`);
let _ = require(`lodash`);
let util = require(`../util/util`);
let debug = {
  template: require(`debug`)(`formio:template:template`),
  items: require(`debug`)(`formio:template:items`),
  install: require(`debug`)(`formio:template:install`),
  save: require(`debug`)(`formio:template:save`),
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
  let baseAlter = (item, template, done) => done(null, item);

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
        if (template.roles.hasOwnProperty(role) && template.roles[role]._id) {
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

  let setFormProperty = (template, entity) => {
    if (
      !entity ||
      !entity.form ||
      (!template.hasOwnProperty('forms') && !template.hasOwnProperty('resources'))
    ) {
      return false;
    }

    let changes = false;

    // Attempt to add a form.
    if (template.forms[entity.form]) {
      entity.form = template.forms[entity.form]._id.toString();
      changes = true;
    }

    // Attempt to add a resource
    if (!changes && template.resources[entity.form]) {
      entity.form = template.resources[entity.form]._id.toString();
      changes = true;
    }

    return changes;
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

      // Update the form property on the form component.
      if ((component.type === 'form') && setFormProperty(template, component)) {
        changed = true;
      }

      // Update resource machineNames for select components with the resource data type.
      if (
        (component.type === `select`) &&
        (component.dataSrc === `resource`) &&
        resourceMachineNameToId(template, component.data)
      ) {
        hook.alter(`importComponent`, template, component.data);
        changed = true;
      }

      // Allow importing of components.
      if (hook.alter(`importComponent`, template, component)) {
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
      transform: (template, role) => role,
      query: function(document, template) {
        let query = {machineName: document.machineName, deleted: {$eq: null}};
        return hook.alter(`importRoleQuery`, query, document, template);
      }
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
              if (!doc) {
                return next();
              }

              resources[machineName] = doc.toObject();
              debug.cleanUp(`Updated resource component _ids for`, machineName);
              next();
            }
          );
        }, done);
      },
      query: function(document, template) {
        let query = {machineName: document.machineName, deleted: {$eq: null}};
        return hook.alter(`importFormQuery`, query, document, template);
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
      },
      query: function(document, template) {
        let query = {machineName: document.machineName, deleted: {$eq: null}};
        return hook.alter(`importFormQuery`, query, document, template);
      }
    },
    action: {
      model: formio.actions.model,
      valid: (actions) => {
        if (typeof actions === 'object' && !(actions instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, action) => {
        resourceMachineNameToId(template, action.settings);
        roleMachineNameToId(template, action.settings);

        // If no changes were made, the form was invalid and we can't insert the action.
        if (formMachineNameToId(template, action) === false) {
          return undefined;
        }

        return action;
      },
      query: function(document, template) {
        let query = {machineName: document.machineName, deleted: {$eq: null}};
        return hook.alter(`importActionQuery`, query, document, template);
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
        debug.items(`No items given to install`);
        return done();
      }

      alter = alter || baseAlter;
      debug.items(items);

      // If the given items don't have a valid structure for this entity, skip the import.
      if (valid && !valid(items)) {
        debug.install(`The given items were not valid: ${JSON.stringify(items)}`);
        return done();
      }

      async.forEachOfSeries(items, (item, machineName, next) => {
        let document = transform
          ? transform(template, item)
          : item;

        // If no document was provided before the alter, skip the insertion.
        if (!document) {
          debug.items(`Skipping item ${item}`);
          return next();
        }

        // Set the document machineName using the import value.
        document.machineName = machineName;
        alter(document, template, (err, document) => {
          if (err) {
            return next(err);
          }
          // If no document was provided after the alter, skip the insertion.
          if (!document) {
            debug.install(`No document was given to install after the alter ${item} (${machineName})`);
            return next();
          }

          debug.install(document);
          let query = entity.query ? entity.query(document, template) : {
            machineName: document.machineName,
            deleted: {$eq: null}
          };

          model.findOne(query, (err, doc) => {
            if (err) {
              debug.install(err);
              return next(err);
            }

            let saveDoc = function(updatedDoc) {
              updatedDoc.save((err, result) => {
                if (err) {
                  debug.install(err.errors || err);
                  return next(err);
                }

                items[machineName] = result.toObject();
                debug.save(machineName);
                debug.save(items[machineName]);
                next();
              });
            };

            if (!doc) {
              debug.install(`Existing not found (${document.machineName})`);
              /* eslint-disable new-cap */
              return saveDoc(new model(document));
              /* eslint-enable new-cap */
            }
            else {
              debug.install(`Existing found`);
              doc = _.assign(doc, document);
              debug.install(doc);
              return saveDoc(doc);
            }
          });
        });
      }, (err) => {
        if (err) {
          debug.install(err);
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

    if (!template.title) {
      template.title = 'Export';
    }
    if (!template.name) {
      template.name = 'Export';
    }

    async.series(hook.alter(`templateImportSteps`, [
      async.apply(install(entities.role), template, template.roles, alter.role),
      async.apply(install(entities.resource), template, template.resources, alter.form),
      async.apply(install(entities.form), template, template.forms, alter.form),
      async.apply(install(entities.action), template, template.actions, alter.action)
    ], install, template), (err) => {
      if (err) {
        debug.template(err);
        return done(err);
      }

      done(null, template);
    });
  };

  // Implement an import endpoint.
  if (router.post) {
    router.post('/import', (req, res, next) => {
      let alters = hook.alter('templateAlters', {});

      let template = req.body.template;
      if (typeof template === 'string') {
        template = JSON.parse(template);
      }

      template = hook.alter('importOptions', template, req, res);
      importTemplate(template, alters, (err, data) => {
        if (err) {
          return next(err.message || err);
        }

        return res.status(200).send('Ok');
      });
    });
  }

  return {
    install,
    template: importTemplate
  };
};
