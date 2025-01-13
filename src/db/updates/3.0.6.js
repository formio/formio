'use strict';

let chance = new (require('chance'))();
let debug = {
  findBrokenForms: require('debug')('formio:update:3.0.6-findBrokenForms'),
  randomizeBrokenFormPaths: require('debug')('formio:update:3.0.6-randomizeBrokenFormPaths')
};

/**
 * Update 3.0.6
 *
 * This update does the following:
 *
 *   1.) finds all forms with invalid paths
 *   2.) assigns random paths to broken forms
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function (db, config, tools) {
  let formCollection = db.collection('forms');

  formCollection
    .find({
      path: {
        $in: [
          'submission', 'report', 'exists', 'export', 'role', 'current', 'logout', 'import', 'form', 'storage/s3',
          'storage/dropbox', 'dropbox/auth', 'upgrade', 'access', 'atlassian/oauth/authorize',
          'atlassian/oauth/finalize', 'sqlconnector'
        ]
      },
      deleted: { $eq: null }
    })
    .toArray()
    .then(forms => {
      debug.findBrokenForms(forms.length);

      const updatePromises = forms.map(form =>
        formCollection.updateOne(
          { _id: tools.util.idToBson(form._id) },
          { $set: { path: chance.word() } }
        ).then(() => {
          debug.randomizeBrokenFormPaths('Updated: ' + form._id);
        })
      );

      return Promise.all(updatePromises);
    })
};
