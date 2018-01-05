'use strict';
let Q = require('q');
let util = require('../../util/util');
let deleteProp = require('delete-property').default;
let ObjectID = require('mongodb').ObjectID;
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
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let forms = db.collection('forms');
  let formsToPurge = {};

  forms.find().snapshot({$snapshot: true}).forEach(function(form) {
    let deleteFns = _(util.flattenComponents(form.components))
      .filter(function(component) {
        // Filter for non-persistent components
        return (component.hasOwnProperty('persistent') && !component.persistent)
      })
      .map(function(component, path) {
        return function(obj) {
          deleteProp('data.' + path)(obj);
        }
      })
      .value();

    if(deleteFns.length) {
      // Save delete functions under the form id
      formsToPurge[form._id.toString()] = deleteFns;
    }
  }, function() {
    let submissions = db.collection('submissions');

    // Create a single query for every form id in formsToPurge
    let query = _.map(Object.keys(formsToPurge), function(id) {
      return {form: new ObjectID(id)};
    });

    let updatePromises = [];

    submissions.find({$or: query}).snapshot({$snapshot: true}).forEach(function(submission) {
      // Call each deleteFn with submission as the argument
      _.invoke(formsToPurge[submission.form.toString()], Function.call, null, submission);
      // Update new submission
      updatePromises.push(submissions.update({_id: submission._id}, submission));
    }, function() {
      // Finish when all updates are done.
      Q.all(updatePromises)
        .then(function() {
          done();
        })
        .catch(done);
    });
  });


};
