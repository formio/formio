'use strict';

let async = require('async');
let chance = new (require('chance'))();
const {logger} = require('@formio/logger');
const findBrokenFormsLogger = logger.child({module: 'formio:update:3.0.6-findBrokenForms'});
const randomizeBrokenFormPathsLogger = logger.child({module: 'formio:update:3.0.6-randomizeBrokenFormPaths'});

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
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let formCollection = db.collection('forms');

  async.waterfall([
    function findBrokenForms(next) {
      formCollection
      .find({
        path: {
          $in: [
            'submission', 'report', 'exists', 'export', 'role', 'current', 'logout', 'import', 'form', 'storage\/s3',
            'storage\/dropbox', 'dropbox\/auth', 'upgrade', 'access', 'atlassian\/oauth\/authorize',
            'atlassian\/oauth\/finalize', 'sqlconnector'
          ]
        },
        deleted: {$eq: null}
      })
      .toArray()
      .then(forms => {
        findBrokenFormsLogger.info(forms.length);
        return next(null, forms);
      })
      .catch(err => next(err));
    },
    function randomizeBrokenFormPaths(forms, next) {
      async.each(forms, function(form, callback) {
        formCollection.updateOne({_id: tools.util.idToBson(form._id)}, {$set: {path: chance.word()}})
        .then(() => {
          randomizeBrokenFormPathsLogger.info('Updated: ' + form._id);
          return callback();
        })
        .catch(err => callback(err));
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
