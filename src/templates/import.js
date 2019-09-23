'use strict';

const async = require(`async`);
const _ = require(`lodash`);
const util = require(`../util/util`);
const EVERYONE = '000000000000000000000000';
const debug = {
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
  const formio = router.formio;
  const hook = require(`../util/hook`)(formio);

  /**
   * A base alter used during import, if one wasn`t supplied for the entity.
   *
   * @param {Object} item
   *   The entity being altered.
   *
   * @param {Function} done
   *   The callback function to invoke, with the entity.
   */
  const baseAlter = (item, template, done) => done(null, item);

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
  const roleMachineNameToId = (template, entity) => {
    if (!entity || !template.hasOwnProperty(`roles`)) {
      return false;
    }

    if (!(entity instanceof Array)) {
      if (entity.hasOwnProperty('role')) {
        if (entity.role === 'everyone') {
          entity.role = EVERYONE;
          return true;
        }
        else if (template.roles.hasOwnProperty(entity.role)) {
          entity.role = template.roles[entity.role]._id.toString();
          return true;
        }
      }

      return false;
    }

    let changes = false;

    // Used for permissions arrays.
    _.each(entity, (access) => {
      _.each(access.roles, (role, i) => {
        if (role === 'everyone') {
          access.roles[i] = EVERYONE;
          changes = true;
        }
        else if (template.roles.hasOwnProperty(role) && template.roles[role]._id) {
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
  const formMachineNameToId = (template, entity) => {
    if (!entity.hasOwnProperty(`form`)) {
      return false;
    }
    const formName = entity.form;
    if (template.hasOwnProperty(`forms`) && template.forms.hasOwnProperty(entity.form)) {
      entity.form = template.forms[formName]._id.toString();
      if (template.forms[formName].hasOwnProperty('_vid') && template.forms[formName]._vid) {
        entity.formRevision = template.forms[formName]._vid.toString();
      }
      return true;
    }
    if (template.hasOwnProperty(`resources`) && template.resources.hasOwnProperty(entity.form)) {
      entity.form = template.resources[formName]._id.toString();
      if (template.resources[formName].hasOwnProperty('_vid') && template.resources[formName]._vid) {
        entity.formRevision = template.resources[formName]._vid.toString();
      }
      return true;
    }

    return false;
  };

  const setFormProperty = (template, entity) => {
    if (
      !entity ||
      !entity.form ||
      (!template.hasOwnProperty('forms') && !template.hasOwnProperty('resources'))
    ) {
      return false;
    }

    let changes = false;

    const formName = entity.form;
    // Attempt to add a form.
    if (template.forms && template.forms[entity.form] && template.forms[entity.form]._id) {
      entity.form = template.forms[formName]._id.toString();
      if (template.forms[formName].hasOwnProperty('_vid') && template.forms[formName]._vid) {
        entity.formRevision = template.forms[formName]._vid.toString();
      }
      changes = true;
    }

    // Attempt to add a resource
    if (!changes && template.resources && template.resources[entity.form] && template.resources[entity.form]._id) {
      entity.form = template.resources[entity.form]._id.toString();
      if (template.resources[formName].hasOwnProperty('_vid') && template.resources[formName]._vid) {
        entity.formRevision = template.resources[formName]._vid.toString();
      }
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
  const resourceMachineNameToId = (template, entity) => {
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
    if (
      entity.resource && template.hasOwnProperty(`resources`) &&
      template.resources[entity.resource] &&
      template.resources[entity.resource]._id
    ) {
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
  const componentMachineNameToId = (template, components) => {
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
  const entities = {
    role: {
      model: formio.resources.role.model,
      valid: (roles) => {
        if (typeof roles === 'object' && !(roles instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, role) => role,
      query(document, template) {
        const query = {
          $or: [
            {
              machineName: document.machineName,
              deleted: {$eq: null}
            },
            {
              title: document.title,
              deleted: {$eq: null}
            }
          ]
        };
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
        componentMachineNameToId(template, resource.components);
        return resource;
      },
      cleanUp: (template, resources, done) => {
        const model = formio.resources.form.model;

        async.forEachOf(resources, (resource, machineName, next) => {
          if (!componentMachineNameToId(template, resource.components)) {
            return next();
          }

          debug.cleanUp(`Need to update resource component _ids for`, machineName);
          model.findOneAndUpdate(
            {_id: resource._id, deleted: {$eq: null}},
            {components: resource.components},
            {new: true}
          ).lean().exec((err, doc) => {
            if (err) {
              return next(err);
            }
            if (!doc) {
              return next();
            }

            resources[machineName] = doc;
            debug.cleanUp(`Updated resource component _ids for`, machineName);
            next();
          });
        }, done);
      },
      query(document, template) {
        const query = {
          $or: [
            {
              machineName: document.machineName,
              deleted: {$eq: null}
            },
            {
              name: document.name,
              deleted: {$eq: null}
            },
            {
              path: document.path,
              deleted: {$eq: null}
            }
          ]
        };
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
      cleanUp: (template, forms, done) => {
        const model = formio.resources.form.model;

        async.forEachOf(forms, (form, machineName, next) => {
          if (!componentMachineNameToId(template, form.components)) {
            return next();
          }

          debug.cleanUp(`Need to update form component _ids for`, machineName);
          model.findOneAndUpdate(
            {_id: form._id, deleted: {$eq: null}},
            {components: form.components},
            {new: true}
          ).lean().exec((err, doc) => {
            if (err) {
              return next(err);
            }
            if (!doc) {
              return next();
            }

            forms[machineName] = doc;
            debug.cleanUp(`Updated form component _ids for`, machineName);
            next();
          });
        }, done);
      },
      query(document, template) {
        const query = {
          $or: [
            {
              machineName: document.machineName,
              deleted: {$eq: null}
            },
            {
              name: document.name,
              deleted: {$eq: null}
            },
            {
              path: document.path,
              deleted: {$eq: null}
            }
          ]
        };
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
      query(document, template) {
        const query = {
          $or: [
            {
              machineName: document.machineName,
              deleted: {$eq: null}
            }
          ]
        };
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
  const install = (entity) => {
    const model = entity.model;
    const valid = entity.valid;
    const transform = entity.transform;
    const cleanUp = entity.cleanUp;
    const createOnly = entity.createOnly;

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
        const document = transform
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
          const query = entity.query ? entity.query(document, template) : {
            machineName: document.machineName,
            deleted: {$eq: null}
          };

          model.findOne(query).exec((err, doc) => {
            if (err) {
              debug.install(err);
              return next(err);
            }

            const saveDoc = function(updatedDoc) {
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
            else if (!createOnly) {
              debug.install(`Existing found`);
              doc = _.assign(doc, document);
              debug.install(doc);
              return saveDoc(doc);
            }
            else {
              debug.install(`Skipping existing entity`);
              items[machineName] = doc.toObject();
              return next();
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
   * Invoke cleanUp method on passed entities
   *
   * @param {Array} data
   *   Array of maps of entities and form templates
   * @param {Object} template
   *   The parsed JSON template to import.
   * @param {Function} done
   *   The callback function to invoke after the cleanUp is complete.
   *
   * @returns {*}
   */
  const cleanUp = (data, template, done) => {
    return async.series(data.map(({entity, forms}) => {
      return async.apply(entity.cleanUp, template, forms);
    }), (err) => {
      if (err) {
        debug.template(err);
        return done(err);
      }

      done(null, template);
    });
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
  const importTemplate = (template, alter, done) => {
    if (!done) {
      done = alter;
      alter = null;
    }
    alter = alter || {};
    if (!template) {
      return done(`No template provided.`);
    }

    async.series(hook.alter(`templateImportSteps`, [
      async.apply(install(entities.role), template, template.roles, alter.role),
      async.apply(install(entities.resource), template, template.resources, alter.form),
      async.apply(install(entities.form), template, template.forms, alter.form),
      async.apply(install(entities.action), template, template.actions, alter.action),
    ], install, template), (err) => {
      if (err) {
        debug.template(err);
        return done(err);
      }

      cleanUp([
        {entity: entities.resource, forms: template.resources},
        {entity: entities.form, forms: template.forms},
      ], template, done);
    });
  };

  // Implement an import endpoint.
  if (router.post) {
    router.post('/import', (req, res, next) => {
      const alters = hook.alter('templateAlters', {});

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
