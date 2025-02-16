'use strict';

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
 */
module.exports = async function(db, config, tools) {
  let formCollection = db.collection('forms');
  let submissionCollection = db.collection('submissions');
  let blackListedComponents = ['select', 'address'];

  let forms = [];
  let uniques = {};

  /**
   * Fix the submissions unique fields.
   *
   * @param submission
   * @param uniques
   * @param next
   * @returns {*}
   */  const fixSubmissionUniques = async (submissions) => {
    for (const submission of submissions) {
      let update = {};
      _.each(uniques[submission.form.toString()], (path) => {
        let item = _.get(submission, 'data.' + path);
        if (item) {
          if (typeof item === 'string') {
            debug.fixSubmissionUniques(submission._id.toString());
            update['data.' + path] = item.toString().toLowerCase();
            // Coerce all unique string fields in an array to be lowercase.
          }
          else if (item instanceof Array && item.length > 0 && typeof item[0] === 'string') {
            _.map(item, (element) => element.toString().toLowerCase());
            // Coerce all unique string fields to be lowercase.
            update['data.' + path] = item;
          }
        }
      });

      if (Object.keys(update).length !== 0) {
        await submissionCollection.updateOne(
          { _id: tools.util.idToBson(submission._id) },
          { $set: update }
        );
      }
    }
  };

  /**
   * Sweep all the forms to get all their uniques.
   *
   * @returns {*}
   */
  const buildUniqueComponentList = async () => {
    const formDocs = await formCollection.find({ _id: { $in: forms }, deleted: { $eq: null } }).toArray();
    formDocs.forEach((form) => {
      tools.util.eachComponent(form.components, (component, path) => {
      // We only care about non-layout components, which are not unique, and have not been blacklisted.

        if (
          _.get(component, 'key') &&
          _.get(component, 'unique') === true &&
          blackListedComponents.indexOf(_.get(component, 'type')) === -1
        ) {
          debug.buildUniqueComponentList(form._id.toString() + ' -> ' + path);
          uniques[form._id.toString()] = uniques[form._id.toString()] || {};
          uniques[form._id.toString()][component.key] = path;
        }
      }, true);
    });
  };


  /**
   * Get all the forms with a unique component in its root components list.
   *
   */

  const getFormsWithUniqueComponents = async () => {
    const formDocs = await formCollection.find({
      components: { $elemMatch: { unique: true, type: { $nin: blackListedComponents } } },
      deleted: { $eq: null }
    }).toArray();
    forms = forms.concat(formDocs.map(form => form._id));
  };

  /**
   * Get all the forms with a unique component within a layout component, that hasnt already been modified.
   *
   */
  const getFormsWithUniqueComponentsInLayoutComponents = async () => {
    const formDocs = await formCollection.find({
      _id: { $nin: forms },
      deleted: { $eq: null },
      components: {
        $elemMatch: {
          $or: [
            { $and: [{ columns: { $exists: true } }, { columns: { $elemMatch: { unique: true, type: { $nin: blackListedComponents } } } }] },
            { $and: [{ rows: { $exists: true } }, { rows: { $elemMatch: { unique: true, type: { $nin: blackListedComponents } } } }] },
            { $and: [{ components: { $exists: true } }, { components: { $elemMatch: { unique: true, type: { $nin: blackListedComponents } } } }] }
          ]
        }
      }
    }).toArray();
    forms = forms.concat(formDocs.map(form => form._id));
  };

  /**
   * Get all the forms with a layout component in a layout component, that hasnt already been modified.
   *
   */
  const getFormsWithPotentialUniqueComponentsInLayoutComponents = async () => {
    const formDocs = await formCollection.find({
      _id: { $nin: forms },
      deleted: { $eq: null },
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
    }).toArray();

    const walkComponents = (components) => {
      for (let a = 0; a < components.length; a++) {
        const component = components[a];
        if (component.unique === true && blackListedComponents.indexOf(component.type) === -1) {
          return true;
        }
        // Check any column components.
        if (component.columns && walkComponents(component.columns)) {
          return true;
        }
        // Check any row components.
        if (component.rows && walkComponents(component.rows)) {
          return true;
        }
        // Check any component components.
        if (component.components && walkComponents(component.components)) {
          return true;
        }
      }
      return false;
    };

    const filtered = [];
    formDocs.forEach((form) => {
      if (walkComponents(form.components)) {
        filtered.push(form._id);
      }
    });

    forms = forms.concat(filtered);
  };

  /**
   * Get all submissions for modification.
   *
   */  const getAffectedSubmissions = async () => {
    return submissionCollection.find({ deleted: { $eq: null }, form: { $in: forms } }).toArray();
  };

    await getFormsWithUniqueComponents();
    await getFormsWithUniqueComponentsInLayoutComponents();
    await getFormsWithPotentialUniqueComponentsInLayoutComponents();
    await buildUniqueComponentList();
    const submissions = await getAffectedSubmissions();
    await fixSubmissionUniques(submissions);
};
