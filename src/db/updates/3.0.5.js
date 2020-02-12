'use strict';

let async = require('async');
let _ = require('lodash');
let debug = {
  getFormsWithUniqueComponents: require('debug')('formio:update:3.0.5-getFormsWithUniqueComponents'),
  getFormsWithUniqueComponentsInLayoutComponents: require('debug')('formio:update:3.0.5-getFormsWithUniqueComponentsInLayoutComponents'),
  getFormsWithPotentialUniqueComponentsInLayoutComponents: require('debug')('formio:update:3.0.5-getFormsWithPotentialUniqueComponentsInLayoutComponents'),
  getAffectedSubmissions: require('debug')('formio:update:3.0.5-getAffectedSubmissions'),
  buildUniqueComponentList: require('debug')('formio:update:3.0.5-buildUniqueComponentList'),
  fixSubmissionUniques: require('debug')('formio:update:3.0.5-fixSubmissionUniques'),
  mergeForms: require('debug')('formio:update:3.0.5-mergeForms')
};

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
  let formCollection = db.collection('forms');
  let submissionCollection = db.collection('submissions');
  let blackListedComponents = ['select', 'address'];

  // List of forms to sweep.
  let forms = [];

  // Unique map for all sweepable forms.
  let uniques = {};

  /**
   * Fix the submissions unique fields.
   *
   * @param submission
   * @param uniques
   * @param next
   * @returns {*}
   */
  let fixSubmissionUniques = function(submissions, next) {
    async.each(submissions, function(submission, cb) {
      let update = {};
      _.each(uniques[submission.form.toString()], function(path, key) {
        let item = _.get(submission, 'data.' + path);
        if (item) {
          // Coerce all unique string fields to be lowercase.
          if (typeof item === 'string') {
            debug.fixSubmissionUniques(submission._id.toString());
            update['data.' + path] = item.toString().toLowerCase();
          }
          // Coerce all unique string fields in an array to be lowercase.
          else if (item instanceof Array && (item.length > 0) && (typeof item[0] === 'string')) {
            _.map(item, function(element) {
              return element.toString().toLowerCase();
            });

            // Coerce all unique string fields to be lowercase.
            update['data.' + path] = item;
          }
        }
      });

      if (Object.keys(update).length === 0) {
        debug.fixSubmissionUniques(submission.form + ': No updates! -> ' + submission._id.toString());
        return cb();
      }
      else {
        debug.fixSubmissionUniques(submission.form + ': Updates! -> ');
        debug.fixSubmissionUniques(update);
      }

      submissionCollection.updateOne(
        {_id: tools.util.idToBson(submission._id)},
        {$set: update},
        function(err) {
          if (err) {
            return cb(err);
          }

          return cb();
        }
      );
    }, function(err) {
      if (err) {
        return next(err);
      }

      return next();
    });
  };

  /**
   * Sweep all the forms to get all their uniques.
   *
   * @param next
   * @returns {*}
   */
  let buildUniqueComponentList = function(next) {
    formCollection.find({_id: {$in: forms}, deleted: {$eq: null}})
      .snapshot(true)
      .forEach(function(form) {
        tools.util.eachComponent(form.components, function(component, path) {
          // We only care about non-layout components, which are not unique, and have not been blacklisted.
          if (
            _.get(component, 'key')
            && _.get(component, 'unique') === true
            && blackListedComponents.indexOf(_.get(component, 'type')) === -1
          ) {
            debug.buildUniqueComponentList(form._id.toString() + ' -> ' + path);
            uniques[form._id.toString()] = uniques[form._id.toString()] || {};
            uniques[form._id.toString()][component.key] = path;
          }
        }, true);
      }, next());
  };

  /**
   * Get all the forms with a unique component in its root components list.
   *
   * @param next
   */
  let getFormsWithUniqueComponents = function(next) {
    formCollection.find({
      components: {$elemMatch: {unique: true, type: {$nin: blackListedComponents}}},
      deleted: {$eq: null}
    }, {_id: 1})
    .snapshot(true)
    .map(function(form) {
      return form._id;
    })
    .toArray(function(err, forms) {
      if (err) {
        return next(err);
      }

      console.log(forms[0])
      debug.getFormsWithUniqueComponents(forms.length);
      return next(null, forms);
    });
  };

  /**
   * Get all the forms with a unique component within a layout component, that hasnt already been modified.
   *
   * @param next
   */
  let getFormsWithUniqueComponentsInLayoutComponents = function(next) {
    formCollection.find({
      _id: {$nin: forms},
      deleted: {$eq: null},
      components: {
        $elemMatch: {
          $or: [
            {$and: [{columns: {$exists: true}}, {columns: {$elemMatch: {unique: true, type: {$nin: blackListedComponents}}}}]},
            {$and: [{rows: {$exists: true}}, {rows: {$elemMatch: {unique: true, type: {$nin: blackListedComponents}}}}]},
            {$and: [{components: {$exists: true}}, {components: {$elemMatch: {unique: true, type: {$nin: blackListedComponents}}}}]}
          ]
        }
      }
    }, {_id: 1})
    .snapshot(true)
    .map(function(form) {
      return form._id;
    })
    .toArray(function(err, forms) {
      if (err) {
        return next(err);
      }

      debug.getFormsWithUniqueComponentsInLayoutComponents(forms.length);
      return next(null, forms);
    });
  };

  /**
   * Get all the forms with a layout component in a layout component, that hasnt already been modified.
   *
   * @param next
   */
  let getFormsWithPotentialUniqueComponentsInLayoutComponents = function(next) {
    formCollection.find({
      _id: {$nin: forms},
      deleted: {$eq: null},
      components: {
        $elemMatch: {
          $or: [
            {columns: {$elemMatch: {
              $or: [
                {columns: {$exists: true}},
                {rows: {$exists: true}},
                {components: {$exists: true}}
              ]
            }}},
            {rows: {$elemMatch: {
              $or: [
                {columns: {$exists: true}},
                {rows: {$exists: true}},
                {components: {$exists: true}}
              ]
            }}},
            {components: {$elemMatch: {
              $or: [
                {columns: {$exists: true}},
                {rows: {$exists: true}},
                {components: {$exists: true}}
              ]
            }}}
          ]
        }
      }
    })
    .snapshot(true)
    .toArray(function(err, forms) {
      if (err) {
        return next(err);
      }

      let walkComponents = function(components) {
        for(let a = 0; a < components.length; a++) {
          // Check the current component, to see if its unique.
          let component = components[a];
          if (
            component.hasOwnProperty('unique')
            && component.unique === true
            && blackListedComponents.indexOf(component.type) === -1
          ) {
            return true;
          }

          // Check any column components.
          if (component.hasOwnProperty('columns') && walkComponents(component.columns) === true) {
            return true;
          }
          // Check any row components.
          if (component.hasOwnProperty('rows') && walkComponents(component.rows) === true) {
            return true;
          }
          // Check any component components.
          if (component.hasOwnProperty('components') && walkComponents(component.components) === true) {
            return true;
          }
        }

        return false;
      };

      let filtered = [];
      forms.forEach(function(form) {
        let res = (walkComponents(form.components) === true);

        if (res) {
          filtered.push(form._id);
        }
      });

      debug.getFormsWithPotentialUniqueComponentsInLayoutComponents(filtered);
      debug.getFormsWithPotentialUniqueComponentsInLayoutComponents(filtered.length);
      return next(null, filtered);
    });
  };

  /**
   * Get all submissions for modification.
   *
   * @param next
   */
  let getAffectedSubmissions = function(next) {
    submissionCollection.find({
      deleted: {$eq: null},
      form: {$in: forms}
    })
    .snapshot(true)
    .toArray(function(err, submissions) {
      if (err) {
        return next(err);
      }

      debug.getAffectedSubmissions(submissions.length);
      return next(null, submissions);
    });
  };

  /**
   * Build the list of forms.
   *
   * @param newForms
   * @param next
   */
  let mergeForms = function(newForms, next) {
    debug.mergeForms('Old: ' + forms.length);
    debug.mergeForms('New: ' + newForms.length);
    forms = forms.concat(newForms);
    debug.mergeForms('Total: ' + forms.length);

    next();
  };

  async.waterfall([
    getFormsWithUniqueComponents,
    mergeForms,
    getFormsWithUniqueComponentsInLayoutComponents,
    mergeForms,
    getFormsWithPotentialUniqueComponentsInLayoutComponents,
    mergeForms,
    buildUniqueComponentList,
    getAffectedSubmissions,
    fixSubmissionUniques
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
