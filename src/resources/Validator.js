'use strict';
const _ = require('lodash');
const {
  ProcessTargets,
  process,
  interpolateErrors,
  escapeRegExCharacters
} = require('@formio/core');
const {evaluateProcess} = require('@formio/vm');
const util = require('../util/util');
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
  constructor(req, submissionModel, formModel, tokenModel, hook, timeout = 500) {
    const tokens = {};
    const token = util.getRequestValue(req, 'x-jwt-token');
    if (token) {
      tokens['x-jwt-token'] = token;
    }
    if (req.headers['x-remote-token']) {
      tokens['x-remote-token'] = req.headers['x-remote-token'];
    }
    if (req.headers['x-token']) {
      tokens['x-token'] = req.headers['x-token'];
    }
    if (req.headers['x-admin-key']) {
      tokens['x-admin-key'] = req.headers['x-admin-key'];
    }

    this.req = req;
    this.submissionModel = submissionModel;
    this.formModel = formModel;
    this.tokenModel = tokenModel;
    this.form = req.currentForm;
    this.project = req.currentProject;
    this.decodedToken = req.token;
    this.tokens = tokens;
    this.hook = hook;
    this.timeout = timeout;
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
    if (submission.hasOwnProperty('state')) {
       query.state = 'submitted';
    }
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

      this.submissionModel.findOne(query, null, collationOptions)
      .then(result => {
        return cb(null, result);
      })
      .catch(err => {
        if (collationOptions.collation) {
          // presume this error comes from db compatibility, try again as regex
          delete query[path];
          this.addPathQueryParams({
            $regex: new RegExp(`^${escapeRegExCharacters(value)}$`),
            $options: 'i'
          }, query, path);
          this.submissionModel.findOne(query)
          .then(result=>cb(null, result))
          .catch(err=>cb(err));
        }
        else {
          return cb(err);
        }
      });
    });
  }

  validateCaptcha(captchaToken) {
    return new Promise((resolve, reject) => {
      this.tokenModel.findOne({value: captchaToken})
      .then(token => {
        if (!token) {
          return resolve(false);
        }

        // Remove temp token after submission with reCaptcha
        return token.remove(() => resolve(true));
      })
      .catch(err=>reject(err));
    });
  }

  async dereferenceDataTableComponent(component) {
    if (
      component.type !== 'datatable'
      || !component.fetch
      || component.fetch.dataSrc !== 'resource'
      || !component.fetch.resource
    ) {
      return [];
    }

    const resourceId = component.fetch.resource;
    const resource = await this.formModel.findOne({_id: resourceId, deleted: null});
    if (!resource) {
      throw new Error(`Resource at ${resourceId} not found for dereferencing`);
    }
    return resource.components || [];
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

    let config = this.project ? (this.project.config || {}) : {};
    config = {...(this.form.config || {}), ...config};

    const context = {
      form: this.form,
      submission: submission,
      components: this.form.components,
      data: submission.data,
      processors: [],
      fetch,
      scope: {},
      config: {
        ...(config || {}),
        headers: JSON.parse(JSON.stringify(this.req.headers)),
        server: true,
        token: this.tokens['x-jwt-token'],
        tokens: this.tokens,
        database: {
          isUnique: async (context, value) => {
            return this.isUnique(context, submission, value);
          },
          validateCaptcha: this.validateCaptcha.bind(this),
          dereferenceDataTableComponent: this.dereferenceDataTableComponent.bind(this)
        }
      }
    };
    try {
      // Process the server processes
      context.processors = ProcessTargets.submission;
      await process(context);
      submission.data = context.data;

      const additionalDeps = this.hook.alter('dynamicVmDependencies', [], this.form);
      // Process the evaulator
      const {scope, data} = await evaluateProcess({
        ...(config || {}),
        form: this.form,
        submission,
        scope: context.scope,
        token: this.tokens['x-jwt-token'],
        tokens: this.tokens,
        timeout: this.timeout,
        additionalDeps
      });
      context.scope = scope;
      submission.data = data;
      submission.scope = scope;

      // Now that the validation is complete, we need to remove fetched data from the submission.
      for (const path in context.scope.fetched) {
        _.unset(submission.data, path);
      }
    }
    catch (err) {
      debug.error(err.message || err);
      return next(err.message || err);
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
