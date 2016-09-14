'use strict';

var async = require('async');
var _ = require('lodash');

/**
 * Update 3.0.5
 *
 * This update does the following.
 *
 *   1.) Finds all forms that have components with unique properties
 *   2.) Coerces all unique fields to be comparable
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  var formCollection = db.collection('forms');

  var coerceToUnique = function(component, path, validation, req, res, next) {
    if (!_.has(req.body, 'data.' + path)) {
      return next();
    }
    var item = _.get(req.body, 'data.' + path);

    // Coerce all unique string fields to be lowercase.
    if (typeof item === 'string') {
      _.set(req.body, 'data.' + path, (_.get(req.body, 'data.' + path)).toString().toLowerCase());
    }

    // Coerce all unique string fields in an array to be lowercase.
    if (item instanceof Array && (item.length > 0) && (typeof item[0] === 'string')) {
      _.map(item, function(element) {
        return element.toString().toLowerCase();
      });

      // Coerce all unique string fields to be lowercase.
      _.set(req.body, 'data.' + path, item);
    }

    return next();
  };

  async.series([
    function getFormsWithUniqueFields(callback) {
      // db.forms.find({components: {$elemMatch: {unique: true}}})
      // Get one level deep of forms with unique components.
      formCollection.find({components: {$elemMatch: {unique: true}}})
        .snapshot({$snapshot: true})
        .forEach(function(form) {

        })
    }
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
