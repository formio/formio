'use strict';

const async = require(`async`);
const _ = require(`lodash`);
const util = require(`../util/util`);
const EVERYONE = '000000000000000000000000';
const {logger} = require('@formio/logger');
const templateLogger = logger.child({module: 'formio:template:template'});
const itemsLogger = logger.child({module: 'formio:template:items'});
const installLogger = logger.child({module: 'formio:template:install'});
const saveLogger = logger.child({module: 'formio:template:save'});
const cleanUpLogger = logger.child({module: 'formio:template:cleanUp'});

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

  const updateRevisionProperty = (item, newValue) => {
    if (item.hasOwnProperty('formRevision')) {
      item.formRevision = newValue;
    }
    item.revision = newValue;
  };

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
  const roleMachineNameToId = (template, entity, fallbacks = []) => {
    if (!entity) {
      return false;
    }

    if (!(entity instanceof Array)) {
      if (entity.hasOwnProperty('role')) {
        if (entity.role === 'everyone') {
          entity.role = EVERYONE;
          return true;
        }
        else if (template.roles && template.roles.hasOwnProperty(entity.role)) {
          entity.role = template.roles[entity.role]._id.toString();
          return true;
        }
        else {
          fallbacks.push(entity);
        }
      }

      return false;
    }

    let changes = false;

    // Used for permissions arrays.
    _.each(entity, (access) => {
      let accessPushedToFallback = false;
      _.each(access.roles, (role, i) => {
        if (role === 'everyone') {
          access.roles[i] = EVERYONE;
          changes = true;
        }
        else if (template.roles && template.roles.hasOwnProperty(role) && template.roles[role]._id) {
          access.roles[i] = template.roles[role]._id.toString();
          changes = true;
        }
        else {
          if (!accessPushedToFallback) {
            fallbacks.push(access);
          }
          accessPushedToFallback = true;
        }
      });
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
        updateRevisionProperty(entity, template.forms[formName]._vid.toString());
      }
      return true;
    }
    if (template.hasOwnProperty(`resources`) && template.resources.hasOwnProperty(entity.form)) {
      entity.form = template.resources[formName]._id.toString();
      if (template.resources[formName].hasOwnProperty('_vid') && template.resources[formName]._vid) {
        updateRevisionProperty(entity, template.resources[formName]._vid.toString());
      }
      return true;
    }

    return false;
  };

  const setFormProperty = (template, entity, fallbacks) => {
    if (
      !entity ||
      !entity.form ||
      (!template.hasOwnProperty('forms') && !template.hasOwnProperty('resources'))
    ) {
      return false;
    }

    let changes = false;

    const getFormRevision = (_vid) => {
      const formRevision = (parseInt(_vid, 10) + 1) || 1;
      return formRevision.toString();
    };

    const formName = entity.form;
    // Attempt to add a form.
    if (template.forms && template.forms[entity.form] && template.forms[entity.form]._id) {
      entity.form = template.forms[formName]._id.toString();
      if (template.forms[formName].revisions) {
        const revisionId = entity.revision;
        const revisionTemplate = template.revisions && template.revisions[`${formName}:${revisionId}`];
        let revision;
        if (revisionTemplate && revisionTemplate.revisionId) {
          revision = revisionTemplate.revisionId;
         }
        else {
          revision = revisionTemplate.newId ? revisionTemplate.newId : getFormRevision(template.forms[formName]._vid);
        }
      updateRevisionProperty(entity, revision);
    }
      changes = true;
    }
    else {
      fallbacks.push(entity);
    }

    // Attempt to add a resource
    if (!changes && template.resources && template.resources[entity.form] && template.resources[entity.form]._id) {
      entity.form = template.resources[entity.form]._id.toString();
      if (template.resources[formName].revisions) {
        const revisionId = entity.revision;
        const revisionTemplate = template.revisions[`${formName}:${revisionId}`];
        let revision;
          if (revisionTemplate && revisionTemplate.revisionId) {
            revision = revisionTemplate.revisionId;
          }
          else {
            revision = revisionTemplate.newId ? revisionTemplate.newId
            : getFormRevision(template.resources[formName]._vid);
          }
        updateRevisionProperty(entity, revision);
      }
      changes = true;
    }

    return changes;
  };

  /**
   * Checks for an existing resource in the Form.io database.
   * This function searches for a form with a specified name and project ID.
   *
   * @param {string} resource - The name of the resource to check.
   * @param {string} projectId - The ID of the project under which to search the resource.
   * @returns {Promise<Object|null>} A promise that resolves with the found document or null if no document is found.
   */
  const checkForExistingResource = (resource, projectId) => {
    return formio.resources.form.model.findOne({
      name: resource,
      project: projectId,
      deleted: {$eq: null}
    }).exec();
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

    // Check if an existing resource exists in the new project.
    if (!changes && !formio.mongoose.Types.ObjectId.isValid(entity.resource)) {
      (async () => {
        try {
          const resource = await checkForExistingResource(entity.resource, template._id);
          if (resource) {
            entity.resource = resource._id;
            changes = true;
          }
        }
        catch (err) {
          installLogger.error(err);
        }
      })();
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
  const componentMachineNameToId = (template, components, fallbacks = []) => {
    let changed = false;
    util.eachComponent(components, (component) => {
      // Update resource machineNames for resource components.
      if ((component.type === `resource`) && resourceMachineNameToId(template, component)) {
        changed = true;
      }

      // Update the form property on the form component.
      if ((component.type === 'form') && setFormProperty(template, component, fallbacks)) {
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

      // During import if select component
      // data type resource de-ref defaultValue
      if (
        component
        && component.type === 'select'
        && component.dataSrc === 'resource'
        && component.defaultValue
      ) {
        component.defaultValue = undefined;
        hook.alter(`importComponent`, template, component);
        changed = true;
      }

      // Update resource machineNames for dataTable components with the resource data type.
      if (
        (component.type === 'datatable') &&
        (component.fetch && component.fetch.dataSrc === 'resource') &&
        resourceMachineNameToId(template, component.fetch)
      ) {
        hook.alter(`importComponent`, template, component.fetch);
        changed = true;
      }

      // Allow importing of components.
      if (hook.alter(`importComponent`, template, component)) {
        changed = true;
      }
    });

     return changed;
  };

  const fallbackNestedForms = (nestedForms, template, cb) => {
    return async.forEach(nestedForms, async (nestedForm) => {
      const query = {
        $or: [
          {
            name: nestedForm.form,
            deleted: {$eq: null},
            project: formio.util.idToBson(template._id),
          },
          {
            path: nestedForm.form,
            deleted: {$eq: null},
            project: formio.util.idToBson(template._id),
          },
          {
            machineName: nestedForm.form,
            deleted: {$eq: null},
            project: formio.util.idToBson(template._id),
          },
        ]
      };
      try {
        const doc = await formio.resources.form.model.findOne(query).exec();
        if (doc) {
          nestedForm.form = formio.util.idToString(doc._id);
        }
      }
      catch (err) {
        installLogger.error(err);
        throw err;
      }
    }, (err) => {
      if (err) {
        return cb(err);
      }
      else {
        return cb();
      }
    });
  };

  const fallbackRoles = async (entities, template, cb) => {
    const query = {
      $or: [
        {
          deleted: {$eq: null},
          project: formio.util.idToBson(template._id),
        },
      ]
    };
    try {
      const docs = await formio.resources.role.model.find(query).exec() || [];
      const rolesMap = {};
      docs.forEach((doc) => {
        rolesMap[_.camelCase(doc.title)] = doc;
      });
      entities.forEach((entity) => {
        if (entity && entity.role && rolesMap.hasOwnProperty(entity.role)) {
          entity.role = rolesMap[entity.role]._id.toString();
        }
        else if (entity && entity.roles && entity.roles.length) {
          entity.roles.forEach((role, i) => {
            if (rolesMap.hasOwnProperty(role)) {
              entity.roles[i] = rolesMap[role]._id.toString();
            }
            else {
              entity.roles[i] = undefined;
            }
          });
          // Filter any unknown roles from the pruning process.
          entity.roles = _.filter(entity.roles);
        }
      });
      return cb();
    }
    catch (err) {
      installLogger.error(err);
      return cb(err);
    }
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
      },
    },
    resource: {
      model: formio.resources.form.model,
      valid: (resources) => {
        if (typeof resources === 'object' && !(resources instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, resource, fallbacks) => {
        roleMachineNameToId(template, resource.submissionAccess, fallbacks.roles);
        roleMachineNameToId(template, resource.access, fallbacks.roles);
        componentMachineNameToId(template, resource.components);
        return resource;
      },
      cleanUp: (template, resources, done) => {
        const model = formio.resources.form.model;

        async.forEachOf(resources, async (resource, machineName, next) => {
          if (!componentMachineNameToId(template, resource.components)) {
            return;
          }

          cleanUpLogger.info(`Need to update resource component _ids for ${machineName}`);
          await model.updateOne(
            {_id: resource._id, deleted: {$eq: null}},
            {$set: {components: resource.components}}
          ).exec();
          const doc = await model.findOne(
            {_id: resource._id, deleted: {$eq: null}}
          ).lean().exec();
          if (!doc) {
            return;
          }

          resources[machineName] = doc;
          cleanUpLogger.info(`Updated resource component _ids for ${machineName}`);
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
      },
      fallBack: ({roles}, form, template, done) => {
        return async.series([
          (cb) => fallbackRoles(roles, template, cb),
        ], (err) => {
          if (err) {
            return done(err);
          }
          return done();
        });
      },
    },
    form: {
      model: formio.resources.form.model,
      valid: (forms) => {
        if (typeof forms === 'object' && !(forms instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, form, fallbacks) => {
        roleMachineNameToId(template, form.submissionAccess, fallbacks.roles);
        roleMachineNameToId(template, form.access, fallbacks.roles);
        componentMachineNameToId(template, form.components, fallbacks.nestedForms);
        return form;
      },
      cleanUp: (template, forms, done) => {
        const model = formio.resources.form.model;

        async.forEachOf(forms, async (form, machineName) => {
          if (!componentMachineNameToId(template, form.components)) {
            return;
          }

          cleanUpLogger.info(`Need to update form component _ids for ${machineName}`);
          await model.updateOne(
            {_id: form._id, deleted: {$eq: null}},
            {$set: {components: form.components}},
          ).exec();
          const doc = await model.findOne(
              {_id: form._id, deleted: {$eq: null}}
            ).lean().exec();
          if (!doc) {
            return;
          }

          forms[machineName] = doc;
          cleanUpLogger.info(`Updated form component _ids for ${machineName}`);
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
      },
      deleteAllActions(form, done) {
        const prun = require('../util/delete')(router);
        prun.action(null, form).then(() => {
          done();
        })
        .catch(error=>{
          done(error);
        });
      },
      fallBack: ({nestedForms, roles}, form, template, done) => {
        return async.series([
          (cb) => fallbackNestedForms(nestedForms, template, cb),
          (cb) => fallbackRoles(roles, template, cb),
        ], (err) => {
          if (err) {
            return done(err);
          }
          return done();
        });
      },
    },
    action: {
      model: formio.actions.model,
      valid: (actions) => {
        if (typeof actions === 'object' && !(actions instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, action, fallbacks) => {
        const isResourceChanged = resourceMachineNameToId(template, action.settings);
        if (!isResourceChanged && action.settings && action.settings.resource) {
          action.settings.resource = '';
        }

        roleMachineNameToId(template, action.settings, fallbacks.roles);

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
      },
      fallBack: ({roles}, form, template, done) => {
        return async.series([
          (cb) => fallbackRoles(roles, template, cb),
        ], (err) => {
          if (err) {
            return done(err);
          }
          return done();
        });
      },
    },
    report: {
      model: formio.resources.submission.model,
      valid: (reports) => {
        if (typeof reports === 'object' && !(reports instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (template, report, fallbacks, requiredAttr) => {
        if (!report) {
          return;
        }

        const reportingFormId = requiredAttr.reportingFormId;

        if (!reportingFormId) {
          return;
        }

        const reportFormsPath = 'data.forms';
        const assignedReportForms = _.get(report, reportFormsPath);
        const reportForms = [];
        let reportDataString = JSON.stringify(report.data);

        _.each(assignedReportForms, (formId, formName) => {
          const formObj = template.forms[formName] || template.resources[formName];
          if (formObj) {
            const newFormId = formObj._id.toString();
            reportForms.push(newFormId);
            reportDataString = _.replace(reportDataString, new RegExp(formId, 'g'), newFormId);
          }
          else {
            reportForms.push(formId);
          }
        });

        try {
          _.assign(report.data, JSON.parse(reportDataString));
        }
        catch (e) {
          return;
        }

        _.set(report, reportFormsPath, reportForms);
        report.form = reportingFormId;
        report.project = template._id.toString();

        return report;
      },
      requiredAttributes: async (template) => {
        const reportingUIFormName = 'reportingui';
        let reportingForm = template.forms[reportingUIFormName] || template.resources[reportingUIFormName];

        if (!reportingForm) {
          reportingForm = await formio.resources.form.model.findOne({
            name: reportingUIFormName,
            deleted: {$eq: null},
            project: formio.util.idToBson(template._id)
          });
        }

        const reportingFormId = reportingForm ? reportingForm._id.toString() : '';

        return {
          error: reportingFormId ? '' : 'Unable to import reports. The reporting UI form is not found',
          reportingFormId
        };
      },
      query(document, template, requiredAttr) {
        return {
          'data.name': _.get(document, 'data.name', ''),
          deleted: {$eq: null},
          form: formio.util.idToBson(requiredAttr.reportingFormId),
          project: document.project
        };
      },
    },
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
    const requiredAttributes = entity.requiredAttributes;

    return async (template, items, alter, done) => {
      // Normalize arguments.
      if (!done) {
        done = alter;
        alter = null;
      }

      // If no items were given for the install, skip this model.
      if (!items || _.isEmpty(items)) {
        itemsLogger.info(`No items given to install`);
        return done();
      }

      alter = alter || baseAlter;
      itemsLogger.info(Object.keys(items));

      // If the given items don't have a valid structure for this entity, skip the import.
      if (valid && !valid(items, template)) {
        installLogger.info(`The given items were not valid: ${JSON.stringify(Object.keys(items))}`);
        return done();
      }

      let requiredAttrs = {};
      // check if some additional data is required to import template
      if (requiredAttributes) {
        requiredAttrs = await requiredAttributes(template);
        if (requiredAttrs.error) {
          installLogger.info(requiredAttrs.error);
          return done();
        }
      }

      const performInstall = (document, machineName, item, next) => {
        // Set the document machineName using the import value.
        document.machineName = machineName;
        alter(document, template, async (err, document) => {
          if (err) {
            return next(err);
          }
          // If no document was provided after the alter, skip the insertion.
          if (!document) {
            installLogger.info(`No document was given to install after the alter ${item.name} (${machineName})`);
            return next();
          }

          installLogger.info(document.name);
          const query = entity.query ? entity.query(document, template, requiredAttrs) : {
            machineName: document.machineName,
            deleted: {$eq: null}
          };

          try {
            let doc = await model.findOne(query).exec();
            const createRevisions = async (result, updatedDoc, revisionsFromTemplate, entity) => {
              const existingRevisions = await hook.alter('formRevisionModel').find({
                deleted: {$eq: null},
                _rid: result._id
              });

              let revisionsToCreate = [];
              const updateFormRevision = async (foundRevision, revisionTemplate, next) => {
                try {
                  await formio.resources.formrevision.model.updateOne(
                    {_id: foundRevision._id},
                    {$set: {revisionId: revisionTemplate.revisionId}}
                  );

                  foundRevision.revisionId = revisionTemplate.revisionId;
              }
              catch (err) {
                return next(err);
                }
              };

              if (existingRevisions && existingRevisions.length > 0) {
                for (const revisionTemplate of revisionsFromTemplate) {
                  const foundRevision = existingRevisions.find(
                    revision => revision._vnote === revisionTemplate._vnote);

                  if (!foundRevision) {
                    revisionTemplate._vid = revisionsToCreate.length + 1;
                    revisionsToCreate.push(revisionTemplate);
                  }
                  else if (revisionTemplate.revisionId) {
                      await updateFormRevision(foundRevision, revisionTemplate, next);
                  }
                }
              }
              else {
                revisionsToCreate = revisionsFromTemplate;
              }

                const res = await hook.alter('formRevisionModel').create(revisionsToCreate);

                await formio.resources.form.model.updateOne({
                  _id: result._id
                },
                {$set:
                  {_vid: revisionsToCreate.length + existingRevisions.length}
                });

                res.forEach((createdRevision, i) => {
                  revisionsToCreate[i].newId = createdRevision._id;
                });
                saveLogger.info(items[machineName].machineName);
                if (entity.hasOwnProperty('deleteAllActions')) {
                  return entity.deleteAllActions(updatedDoc._id, next);
                }
            };
            const saveDoc = async function(updatedDoc, isNew = false) {
              try {
               const result = isNew
                ? await model.create(updatedDoc)
                : await model.findOneAndUpdate({
                  _id: updatedDoc._id
                }, {
                  $set: updatedDoc
                }, {
                  new: true
                });

                items[machineName] = result.toObject();

                if ((result.type === 'form' || result.type === 'resource') && result.revisions ) {
                  const revisionsFromTemplate = [];
                  _.forEach(template.revisions, (revisionData, revisionKey)=>{
                    if (revisionKey.match(`^${result.name}:`)) {
                      revisionData._rid = result._id;
                      revisionData.project = result.project;
                      revisionData.path = result.path;
                      revisionData.name = result.name;
                      revisionData._vuser = 'system';
                      revisionData._vnote = `Deploy version tag ${template.tag}`;
                      revisionData.owner = result.owner;
                      revisionData._vid = revisionsFromTemplate.length + 1;
                      roleMachineNameToId(template, revisionData.access);
                      roleMachineNameToId(template, revisionData.submissionAccess);
                      revisionsFromTemplate.push(revisionData);
                    }
                  });

                  revisionsFromTemplate.sort((rev1, rev2)=>rev1.created - rev2.created);
                  if (revisionsFromTemplate.length > 0
                    && !_.isEqual(revisionsFromTemplate[revisionsFromTemplate.length -1].components,
                    result.components.toObject()
                    )) {
                      const lastRevision = Object.assign({}, result.toObject());
                      lastRevision._rid = result._id;
                      lastRevision._vuser = 'system';
                      lastRevision._vid = revisionsFromTemplate.length + 1;
                      lastRevision._vnote = `Deploy version tag ${template.tag}`;
                      delete lastRevision._id;
                      delete lastRevision.__v;
                      revisionsFromTemplate.push(lastRevision);
                  }

                  if (revisionsFromTemplate.length > 0) {
                    await createRevisions(result, updatedDoc, revisionsFromTemplate, entity);

                    return next();
                  }
                  else {
                        saveLogger.info(items[machineName].machineName);
                        // eslint-disable-next-line max-depth
                        if (entity.hasOwnProperty('deleteAllActions')) {
                          return entity.deleteAllActions(updatedDoc._id, next);
                        }
                    return next();
                  }
                }
                else {
                  saveLogger.info(items[machineName].machineName);
                  if (entity.hasOwnProperty('deleteAllActions')) {
                    return entity.deleteAllActions(updatedDoc._id, next);
                  }
                  return next();
                }
              }
              catch (err) {
                installLogger.error(err.errors || err);
                return next(err);
              }
            };

            const setVid = (document, _vid) => {
              if (document && document.hasOwnProperty('_vid')) {
                document._vid = _vid;
              }
            };

            if (!doc) {
              installLogger.info(`Existing not found (${document.machineName})`);
              setVid(document, 0);
              /* eslint-disable new-cap */
              return saveDoc(new model(document), true);
              /* eslint-enable new-cap */
            }
            else if (!createOnly) {
              installLogger.info(`Existing found`);
              doc = _.assign(doc, document);
              setVid(doc, 0);
              installLogger.info(doc.machineName);
              return saveDoc(doc);
            }
            else {
              installLogger.info(`Skipping existing entity`);
              items[machineName] = doc.toObject();
              return next();
            }
          }
          catch (err) {
            installLogger.error(err);
            return next(err);
          }
        });
      };

      async.forEachOfSeries(items, (item, machineName, next) => {
        const fallbacks = {
          roles: [],
          nestedForms: [],
          nestedResources: [],
        };
        const document = transform
          ? transform(template, item, fallbacks, requiredAttrs)
          : item;

        // If no document was provided before the alter, skip the insertion.
        if (!document) {
          itemsLogger.info(`Skipping item ${item}`);
          return next();
        }

        if (typeof entity.fallBack === 'function' && Object.values(fallbacks).some((items) => !!items.length)) {
          entity.fallBack(fallbacks, document, template, () => {
            performInstall(document, machineName, item, next);
          });
        }
        else {
          performInstall(document, machineName, item, next);
        }
      }, (err) => {
        if (err) {
          installLogger.error(err);
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
        templateLogger.error(err);
        return done(err);
      }

      done(null, template);
    });
  };

  const alterFormSave = (forms, alter) => {
    return Object.values(forms || {}).map((form) => {
      return async.apply((done) => alter(form, done));
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

    const importSteps = [
      async.apply(install(entities.role), template, template.roles, alter.role),
      async.apply(install(entities.resource), template, template.resources, alter.form),
      async.apply(install(entities.form), template, template.forms, alter.form),
      async.apply(install(entities.action), template, template.actions, alter.action),
    ];

    if (hook.alter(`includeReports`)) {
      importSteps.push(async.apply(install(entities.report), template, template.reports));
    }

    async.series(hook.alter(`templateImportSteps`, importSteps, install, template), (err) => {
      if (err) {
        templateLogger.error(err);
        return done(err);
      }

      cleanUp([
        {entity: entities.resource, forms: template.resources},
        {entity: entities.form, forms: template.forms},
      ], template, (err, data) => {
        if (err) {
          return done(err);
        }

        if (!alter.formSave) {
          return done(null, data);
        }

        return async.series(
          [
            ...alterFormSave(data.forms, alter.formSave),
            ...alterFormSave(data.resources, alter.formSave),
          ],
          () => done(null, data),
        );
      });
    });
  };

  function tryToLoadComponents(components, template, projectId, isFormId) {
    async.each(components, (component) => {
      const query = {
        deleted: {$eq: null}
      };

      if ( projectId ) {
        query.project = projectId;
      }

      if (!isFormId) {
        query.path = component.form;
      }
      else {
        query._id = component.form;
      }

      return formio.resources.form.model.find(query).exec().then((results) => {
        if (results.length) {
          const result = results[0];
          const newItem = {
              "title": result.title ,
              "type": result.type,
              "name": result.name,
              "path": result.path,
              "tags": result.tags,
              "components": result.components
          };

          if (isFormId) {
            component.form = result.path;
          }

          if (result.type==='form') {
            template.forms[newItem.name]=newItem;
          }
          else {
            template.resources[newItem.name]=newItem;
          }
          const formComponents = checkForm(newItem.components, template);
          if (formComponents.length !== 0) {
            tryToLoadComponents(formComponents, template, projectId, true);
          }
          else {
            return;
          }
        }
      })
      .catch(err => {
        templateLogger.error(err);
      });
    });
  }

  function findProjectId(template) {
    const query = {
      deleted: {$eq: null},
      name: template.name
    };
    return formio.resources.project.model.findOne(query).exec().then( project => {
      return project._id;
    })
    .catch(err => {
      templateLogger.error(err);
    });
  }

  function checkTemplate(components, template) {
    const resultArr = [];
      components.forEach((component)=>{
        if (component.hasOwnProperty('form') &&
        !(template.forms.hasOwnProperty(component.form) ||
        template.resources.hasOwnProperty(component.form))) {
          resultArr.push(component);
        }
      });
    return resultArr;
  }

  function checkForm(components, template) {
     const resultArr = [];
      util.eachComponent(components, (component)=>{
        if (component.hasOwnProperty('form') &&
        !(template.forms.hasOwnProperty(component.form) ||
        template.resources.hasOwnProperty(component.form))) {
          resultArr.push(component);
        }
      });
    return resultArr;
}

  // Implement an import endpoint.
  if (router.post) {
    router.post('/import', (req, res, next) => {
      const alters = hook.alter('templateAlters', {});

      let template = req.body.template;
      if (typeof template === 'string') {
        template = JSON.parse(template);
      }

      const components = Object.values(template.forms).concat(Object.values(template.resources));

      const missingComponents = checkTemplate(components, template);
      if (missingComponents.length !== 0 ) {
        findProjectId(template)
          .then((projectId) => {
              tryToLoadComponents(missingComponents, template, projectId);
                template = hook.alter('importOptions', template, req, res);
                importTemplate(template, alters, (err, data) => {
                  if (err) {
                    return next(err.message || err);
                  }
                  return res.status(200).send('Ok');
                });
          });
      }
      else {
        template = hook.alter('importOptions', template, req, res);
        importTemplate(template, alters, (err, data) => {
          if (err) {
            return next(err.message || err);
          }
          return res.status(200).send('Ok');
        });
      }
    });
  }

  return {
    install,
    template: importTemplate,
    checkTemplate,
    checkForm,
    tryToLoadComponents,
    findProjectId
  };
};
