'use strict';
const _ = require('lodash');
const {
  ProcessTargets,
  process,
  processSync,
  interpolateErrors,
  escapeRegExCharacters
} = require('@formio/core');
const {evaluateProcess} = require('@formio/vm');
const fetch = require('@formio/node-fetch-http-proxy');
const debug = {
  validator: require('debug')('formio:validator'),
  error: require('debug')('formio:error')
};

/**
 * @TODO: Isomorphic validation system.
 *
 * @param form
 * @param model
 * @constructor
 */
class Validator {
  constructor(form, model, token, decodedToken, hook) {
    this.model = model;
    this.form = form;
    this.token = token;
    this.hook = hook;
  }

  addPathQueryParams(pathQueryParams, query, path) {
    const pathArray = path.split(/\[\d+\]?./);
    const needValuesInArray = pathArray.length > 1;
    let pathToValue = path;
    if (needValuesInArray) {
      pathToValue = pathArray.shift();
      const pathQueryObj = {};
      _.reduce(pathArray, (pathQueryPath, pathPart, index) => {
        const isLastPathPart = index === (pathArray.length - 1);
        const obj = _.get(pathQueryObj, pathQueryPath, pathQueryObj);
        const addedPath = `$elemMatch['${pathPart}']`;
        _.set(obj, addedPath, isLastPathPart ? pathQueryParams : {});
        return pathQueryPath ? `${pathQueryPath}.${addedPath}` : addedPath;
      }, '');
      query[pathToValue] = pathQueryObj;
    }
    else {
      query[pathToValue] = pathQueryParams;
    }
  }

  async isUnique(context, submission, value) {
    const {component} = context;
    const path = `data.${context.path}`;
    // Build the query
    const query = {form: this.form._id};
    let collationOptions = {};

    if (_.isString(value)) {
      if (component.dbIndex) {
        this.addPathQueryParams(value, query, path);
      }
      // These are kind of hacky but provides for a more efficient "unique" validation when the string is an email,
      // because we (by and large) only have to worry about ASCII and partial unicode; this way, we can use collation-
      // aware indexes with case insensitive email searches to make things like login and registration a whole lot faster
      else if (
        component.type === 'email' ||
        (
          component.type === 'textfield' &&
          component.validate &&
          component.validate.pattern === '[A-Za-z0-9]+'
        )
      ) {
        this.addPathQueryParams(value, query, path);
        collationOptions = {collation: {locale: 'en', strength: 2}};
      }
      else {
        this.addPathQueryParams({
          $regex: new RegExp(`^${escapeRegExCharacters(value)}$`),
          $options: 'i'
        }, query, path);
      }
    }
    // FOR-213 - Pluck the unique location id
    else if (
      _.isPlainObject(value) &&
      value.address &&
      value.address['address_components'] &&
      value.address['place_id']
    ) {
      this.addPathQueryParams({
        $regex: new RegExp(`^${escapeRegExCharacters(value.address['place_id'])}$`),
        $options: 'i'
      }, query, `${path}.address.place_id`);
    }
    // Compare the contents of arrays vs the order.
    else if (_.isArray(value)) {
      this.addPathQueryParams({$all: value}, query, path);
    }
    else if (_.isObject(value) || _.isNumber(value)) {
      this.addPathQueryParams({$eq: value}, query, path);
    }
    // Only search for non-deleted items
    query.deleted = {$eq: null};
    query.state = 'submitted';
    return new Promise((resolve) => {
      const cb = (err, result) => {
        if (err) {
          return resolve(false);
        }
        else if (result) {
          // Only OK if it matches the current submission
          if (submission._id && (result._id.toString() === submission._id)) {
            resolve(true);
          }
          else {
            component.conflictId = result._id.toString();
            return resolve(false);
          }
        }
        else {
          return resolve(true);
        }
      };

      this.model.findOne(query, null, collationOptions, (err, result) => {
        if (err && collationOptions.collation) {
          // presume this error comes from db compatibility, try again as regex
          delete query[path];
          this.addPathQueryParams({
            $regex: new RegExp(`^${escapeRegExCharacters(value)}$`),
            $options: 'i'
          }, query, path);
          this.model.findOne(query, cb);
        }
        else {
          return cb(err, result);
        }
      });
    });
  }

  /**
   * Validate a submission for a form.
   *
   * @param {Object} submission
   *   The data submission object.
   * @param next
   *   The callback function to pass the results.
   */
  /* eslint-disable max-statements */
  async validate(submission, next) {
    debug.validator('Starting validation');

    // Skip validation if no data is provided.
    if (!submission.data) {
      debug.validator('No data skipping validation');
      return next();
    }

    const context = {
      form: this.form,
      submission: submission,
      components: this.form.components,
      data: submission.data,
      processors: [],
      fetch,
      scope: {},
      config: {
        server: true,
        token: this.token,
        database: {
          isUnique: async (context, value) => {
            return this.isUnique(context, submission, value);
          }
        }
      }
    };
    try {
      // Process the server processes
      context.processors = ProcessTargets.submission;
      await process(context);
      submission.data = context.data;

      // Process the evaulator
      const {scope, data} = await evaluateProcess({
        form: this.form,
        submission,
        scope: context.scope,
        token: this.token,
      });
      context.scope = scope;
      submission.data = data;
    }
    catch (err) {
      debug.error(err);
      return next(err);
    }

    // If there are errors, return the errors.
    if (context.scope.errors && context.scope.errors.length) {
      return next({
        name: 'ValidationError',
        details: interpolateErrors(context.scope.errors)
      });
    }

    return next(null, submission.data, this.form.components);
  }
}

module.exports = Validator;
