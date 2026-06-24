'use strict';

let async = require('async');
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
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let formCollection = db.collection('forms');

  async.waterfall([
    function findBrokenForms(next) {
      formCollection
        .find({type: {$nin: ['form', 'resource']}, deleted: {$eq: null}})
        .snapshot(true)
        .toArray()
        .then(forms => {
          debug.findBrokenForms(forms.length);
          return next(null, forms);
        })
        .catch(err => next(err));
    },
    function fixTypes(forms, next) {
      async.each(forms, function(form, callback) {
        formCollection.updateOne({_id: tools.util.idToBson(form._id)}, {$set: {type: 'form'}})
        .then(() => {
          debug.fixTypes('Updated: ' + form._id);
          return callback();
        })
        .catch(err =>callback(err));
      }, function(err) {
        if (err) {
          return next(err);
        }

        return next();
      });
    }
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
