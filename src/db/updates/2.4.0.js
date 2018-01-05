'use strict';
let Q = require('q');
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
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let forms = db.collection('forms');
  let formPromises = [];

  forms.find().snapshot({$snapshot: true}).forEach(function(form) {
    let componentPromises = [];
    // Loop through all components
    utils.eachComponent(form.components, function(component) {
      // Ignore non-input or non-embedded components
      if(!component.key || component.key.indexOf('.') === -1) {
        return;
      }

      // Find source of embedded component form first part of key
      let keyParts = component.key.split('.');
      componentPromises.push(forms.findOne({name: keyParts[0], project: form.project}).then(function(resource) {
        if(resource === null) {
          // Embedded component had bad name, attempt to fix by camel casing name
          return forms.findOne({name: _.camelCase(keyParts[0]), project: form.project}).then(function(resource) {
            if(resource === null) {
              // Still can't find resource, give up b/c name is too broken to fix
              return;
            }

            // Update source and key
            component.source = resource._id;
            keyParts[0] = resource.name;
            component.key = keyParts.join('.');
          });
        }

        // Update source
        component.source = resource._id;
      }));
    });

    if(componentPromises.length) {
      formPromises.push(Q.all(componentPromises).thenResolve(form));
    }
  }, function() {
    Q.all(formPromises)
    .then(function(changedForms) {
      // Update each form's components
      return Q.all(changedForms.map(function(form) {
        return forms.updateOne({_id: form._id}, {$set:{components: form.components}});
      }));
    })
    .then(function() {
      done();
    })
    .catch(done);
  });


};
