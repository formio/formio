'use strict';

var async = require('async');
var invalid =  /(^|\/)(form)($|\/)/;

/**
 * Update 2.3.2
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 *
 * Update all forms to have the required fields.
 */
module.exports = function(db, config, tools, done) {
  var forms = db.collection('forms');
  var projPaths = {};

  var makeUnique = function(form, cb) {
    var iter = 2;
    var comparison = form.path.toString() + iter.toString();
    while (form.path.match(invalid) || projPaths[form.project.toString()].indexOf(comparison) !== -1) {
      comparison = form.path.toString() + (++iter).toString();
    }

    forms.findOneAndUpdate({_id: form._id}, {$set: {path: comparison.toLowerCase()}}, function(err) {
      if (err) {
        return cb(err);
      }

      projPaths[form.project.toString()].push(comparison);
      cb();
    });
  };

  var verifyUniquePaths = function() {
    projPaths = {};
    forms.find({}).snapshot({$snapshot: true}).toArray(function(err, docs) {
      async.eachSeries(docs, function(form, cb) {
        projPaths[form.project.toString()] = projPaths[form.project.toString()] || [];

        if (form.path.match(invalid) || projPaths[form.project.toString()].indexOf(form.path) !== -1) {
          makeUnique(form, cb);
        }
        else {
          projPaths[form.project.toString()].push(form.path);
          cb();
        }
      }, function(err) {
        if (err) {
          return done(err);
        }

        done();
      })
    })
  };

  forms.find({$or: [{path: {$eq: ''}}, {path: {$eq: null}}, {path: {$regex: /(^|\/)(form)($|\/)/}}]})
    .snapshot({$snapshot: true})
    .toArray(function(err, docs) {
      async.eachSeries(docs, function(form, cb) {
        forms.findOneAndUpdate({_id: form._id}, {$set: {path: form.name.toLowerCase()}}, function(err) {
          if (err) {
            return cb(err);
          }

          cb();
        });
      }, function(err) {
        if (err) {
          return done(err);
        }

        verifyUniquePaths();
      });
  });
};
