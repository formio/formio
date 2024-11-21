'use strict';
let util = require('../../util/util');
let deleteProp = require('delete-property').default;
let ObjectID = require('mongodb').ObjectId;
let _ = require('lodash');
/**
 * Update 2.4.1
 *
 *  Removes submission data for non-persistent components
 *  mistakenly saved to the DB.
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = async function (db, config, tools) {
  let forms = db.collection('forms');
  let submissions = db.collection('submissions');
  let formsToPurge = {};

    let formsArray = await forms.find().toArray();
    formsArray.forEach((form) => {
      let deleteFns = _(util.flattenComponents(form.components))
        .filter((component) => {
          // Filter for non-persistent components
          return component.hasOwnProperty('persistent') && !component.persistent;
        })
        .map((component, path) => {
          return function (obj) {
            deleteProp('data.' + path)(obj);
          };
        })
        .value();

      if (deleteFns.length) {
        // Save delete functions under the form id
        formsToPurge[form._id.toString()] = deleteFns;
      }
    });

    // Create a single query for every form id in formsToPurge
    let query = _.map(Object.keys(formsToPurge), (id) => {
      return { form: new ObjectID(id) };
    });

    let submissionsArray = await submissions.find({ $or: query }).toArray();

    for (let submission of submissionsArray) {
      // Call each deleteFn with submission as the argument
      _.invoke(formsToPurge[submission.form.toString()], Function.call, null, submission);
      // Update new submission
      await submissions.updateOne({ _id: submission._id }, { $set: submission });
    }

};
