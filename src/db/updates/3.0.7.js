'use strict';

let debug = {
  findBrokenForms: require('debug')('formio:update:3.0.7-findBrokenForms'),
  fixTypes: require('debug')('formio:update:3.0.7-fixTypes')
};

/**
 * Update 3.0.7
 *
 * This update does the following:
 *
 *   1.) finds all forms with invalid types
 *   2.) turns all undefined and invalid types into form
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function (db, config, tools) {
  let formCollection = db.collection('forms');

  formCollection
    .find({ type: { $nin: ['form', 'resource'] }, deleted: { $eq: null } })
    .snapshot(true)
    .toArray()
    .then(forms => {
      debug.findBrokenForms(forms.length);

      const updatePromises = forms.map(form =>
        formCollection.updateOne({_id: tools.util.idToBson(form._id)}, {$set: {type: 'form'}})
        .then(() => {
          debug.fixTypes('Updated: ' + form._id);
        })
      );

      return Promise.all(updatePromises);
    });
};
