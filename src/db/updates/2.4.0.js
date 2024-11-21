'use strict';

let _ = require('lodash');
let utils = require('../../util/util');

/**
 * Update 2.4.0
 *
 *  - Adds source setting to embedded form components,
 *    pointing to the resource the component came from.
 *  - Attempts to fix embedded component keys with bad key
 *    names by converting the resource name to camel case.
 *    (This fixes a good % of embedded components, and the
 *    ones that don't get fixed were broken anyways.)
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = async function (db, config, tools) {
  let forms = db.collection('forms');

  try {
    let formsArray = await forms.find().toArray();

    for (let form of formsArray) {
      let componentPromises = [];

      // Loop through all components
      utils.eachComponent(form.components, (component) => {
        // Ignore non-input or non-embedded components
        if (!component.key || component.key.indexOf('.') === -1) {
          return;
        }

        // Find source of embedded component form first part of key
        let keyParts = component.key.split('.');
        componentPromises.push(
          forms.findOne({ name: keyParts[0], project: form.project }).then(async (resource) => {
            if (resource === null) {
              // Embedded component had bad name, attempt to fix by camel casing name
              resource = await forms.findOne({ name: _.camelCase(keyParts[0]), project: form.project });
              if (resource === null) {
                // Still can't find resource, give up b/c name is too broken to fix
                return;
              }

              // Update source and key
              component.source = resource._id;
              keyParts[0] = resource.name;
              component.key = keyParts.join('.');
            } else {
              // Update source
              component.source = resource._id;
            }
          })
        );
      });

      if (componentPromises.length) {
        await Promise.all(componentPromises);
        // Update the form's components
        await forms.updateOne({ _id: form._id }, { $set: { components: form.components } });
      }
    }
  } catch (err) {
    console.error('Error occurred during the update:', err);
  }
};
