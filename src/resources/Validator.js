'use strict';
const _ = require('lodash');
const {ObjectId} = require('mongodb');
const {
  ProcessTargets,
  process,
  interpolateErrors,
  escapeRegExCharacters,
  serverRules,
  Utils: CoreUtils,
} = require('@formio/core');
const {evaluateProcess} = require('@formio/vm');
const Utils = require('../util/util');
const fetch = require('@formio/node-fetch-http-proxy');
const {logger} = require('@formio/logger');
const validatorLogger = logger.child({module: 'formio:validator'});

async function loadFormById(cache, req, formId) {
  const resource = await cache.loadForm(req, null, formId);
  return resource;
}

async function submissionQueryExists(submissionModel, query) {
    const result = await submissionModel.find(query);
    if (result.length === 0 || !result) {
      return false;
    }
    return true;
}

/**
 * @TODO: Isomorphic validation system.
 *
 * @param form
 * @param model
 * @constructor
 */
class Validator {
  constructor(req, submissionModel, submissionResource, cache, formModel, tokenModel, hook, config = {}) {
    const tokens = {};
    const token = Utils.getRequestValue(req, 'x-jwt-token');
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
    this.submissionResource = submissionResource;
    this.cache = cache;
    this.formModel = formModel;
    this.tokenModel = tokenModel;
    this.form = req.currentForm;
    this.project = req.currentProject;
    this.decodedToken = req.token;
    this.tokens = tokens;
    this.hook = hook;
    this.config = config;
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
        (component.type === 'email' ||
        (
          component.type === 'textfield' &&
          component.validate &&
          component.validate.pattern === '[A-Za-z0-9]+'
        )) && this.config.mongoFeatures?.collation
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
    const cb = (err, result) => {
      if (err) {
        return false;
      }
      else if (result) {
        // Only OK if it matches the current submission
        if (submission._id && (result._id.toString() === submission._id)) {
          return true;
        }
        else {
          component.conflictId = result._id.toString();
          return false;
        }
      }
      else {
        return true;
      }
    };

    try {
      const result = await this.submissionModel.findOne(query, null, collationOptions);
      return cb(null, result);
    }
    catch (err) {
        return cb(err);
    }
  }

  async validateCaptcha(captchaToken) {
    const token = await this.tokenModel.findOne({value: captchaToken});
    if (!token) {
      return false;
    }

    // Remove temp token after submission with reCaptcha
    return token.remove(() => true);
  }

  async validateResourceSelectValue(context, value) {
    const {component} = context;
    if (!component.data.resource) {
      throw new Error('Did not receive resource ID for resource select validation');
    }
    const resource = await loadFormById(this.cache, this.req, component.data.resource);
    if (!resource) {
      throw new Error('Resource not found');
    }
    // Curiously, if a value property is not provided, the renderer will submit the entire object.
    // Even if the user selects "Entire Object" as the value property, the renderer will submit only
    // the data object. If we don't have a value property we can fallback to the _id, if we don't
    // have an _id we can fall back to the data object OR the data object plus the "submit" property
    // (which seems to sometimes be stripped and sometimes not).
    const valueQuery = component.valueProperty
      ? {[component.valueProperty]: value}
      : value._id
      ? {_id: value._id}
      : {$or: [{data: value}, {data: {...value, submit: true}}]};
    if (!component.filter) {
      component.filter = '';
    }
    const filterQueries = component.filter.split(',').reduce((acc, filter) => {
      const [key, value] = filter.split('=');
      return {...acc, [key]: value};
    }, {});
    Utils.coerceQueryTypes(filterQueries, resource, 'data.');

    const query = {
      form: new ObjectId(component.data.resource),
      deleted: null,
      $and:[
        valueQuery,
        this.submissionResource.getFindQuery({query: filterQueries})
      ]
    };
    if (component.data.resource.hasOwnProperty('state')) {
      query.state = 'submitted';
    }
    return await submissionQueryExists(this.submissionModel, query);
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
    const resource = await this.formModel.findOne({_id: new ObjectId(resourceId.toString()), deleted: null});
    if (!resource) {
      throw new Error(`Resource at ${resourceId} not found for dereferencing`);
    }
    const dataTableComponents = (component.fetch.components || [])
      .map(component => CoreUtils.getComponent(resource.components || [], component.path));

    const filterComponents = (component) => {
      const info = CoreUtils.componentInfo(component);
      if (!(info.hasColumns || info.hasRows || info.hasComps)) {
        return component;
      }
      if (info.hasColumns) {
        component.columns = component.columns.map((column) => {
          column.components = column.components
            .map((component) => filterComponents(component))
            .filter((component) => {
              return CoreUtils.getComponent(dataTableComponents, component.key) || (
                component.columns?.length > 0 ||
                component.rows?.length > 0 ||
                component.components?.length > 0
              );
            });
          return column;
        });
      }
      else if (info.hasRows) {
        component.rows = component.rows.map((row) => {
          if (Array.isArray(row)) {
            return row.map((column) => {
              column.components = column.components
                .map((component) => filterComponents(component))
                .filter((component) => {
                  return CoreUtils.getComponent(dataTableComponents, component.key) || (
                    component.columns?.length > 0 ||
                    component.rows?.length > 0 ||
                    component.components?.length > 0
                  );
                });
              return column;
            });
          }
          return row;
        });
      }
      else {
        component.components = component.components
          .map((component) => filterComponents(component))
          .filter((component) => {
              return CoreUtils.getComponent(dataTableComponents, component.key) || (
                component.columns?.length > 0 ||
                component.rows?.length > 0 ||
                component.components?.length > 0
              );
          });
      }
      return component;
    };

    return filterComponents(resource).components || [];
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
    validatorLogger.info('Starting validation');

    // Skip validation if no data is provided.
    if (!submission.data) {
      validatorLogger.info('No data skipping validation');
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
        database: this.hook.alter('validationDatabaseHooks', {
          isUnique: async (context, value) => {
            return this.isUnique(context, submission, value);
          },
          validateResourceSelectValue: this.validateResourceSelectValue.bind(this),
          dereferenceDataTableComponent: this.dereferenceDataTableComponent.bind(this)
        }, this)
      }
    };
    try {
      // Process the server processes
      context.processors = ProcessTargets.submission;
      context.rules = this.hook.alter('serverRules', serverRules);
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
      validatorLogger.error(err.message || err);
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
