'use strict';
var Q = require('q');
var util = require('../../util/util');
var deleteProp = require('delete-property');
var ObjectID = require('mongodb').ObjectID;
var _ = require('lodash');
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
  var forms = db.collection('forms');
  var formsToPurge = {};

  forms.find().snapshot({$snapshot: true}).forEach(function(form) {
    var deleteFns = _(util.flattenComponents(form.components))
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
    var submissions = db.collection('submissions');

    // Create a single query for every form id in formsToPurge
    var query = _.map(Object.keys(formsToPurge), function(id) {
      return {form: new ObjectID(id)};
    });

    var updatePromises = [];

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
