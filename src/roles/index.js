'use strict';

var resource = require('resourcejs');
var mongoose = require('mongoose');

module.exports = function(router) {
  // Include the hook system.
  var hook = require('../util/hook')(router.formio);

  /**
   * The Schema for Roles.
   *
   * @type {exports.Schema}
   */
  var RoleSchema = hook.alter('roleSchema', new mongoose.Schema({
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    deleted: {
      type: Number,
      default: null
    },
    default: {
      type: Boolean,
      default: false
    },
    admin: {
      type: Boolean,
      default: false
    }
  }));

  RoleSchema.path('title').validate(function(value, done) {
    var search = hook.alter('roleSearch', {
      title: value,
      deleted: {$eq: null}
    }, this, value);

    // Ignore the id of the role, if this is an update.
    if (this._id) {
      search._id = { $ne: this._id };
    }

    // Search for roles that exist, with the given parameters.
    mongoose.model('role').findOne(search, function(err, result) {
      if (err || result) {
        return done(false);
      }

      done(true);
    });
  }, 'Role title must be unique.');

  // Add timestamps to the schema.
  RoleSchema.plugin(require('../plugins/timestamps'));

  // Return the defined roles and permissions functions.
  return {
    /**
     * Create the REST properties for Roles, using ResourceJS
     *
     * Adds the endpoints:
     * [GET]    /role
     * [POST]   /role
     * [GET]    /role/:roleId
     * [PUT]    /role/:roleId
     * [DELETE] /role/:roleId
     */
    resource: resource(router, '', 'role', mongoose.model('role', RoleSchema)).rest(hook.alter('roleRoutes', {
      before: [
        router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
        router.formio.middleware.deleteRoleHandler,
        router.formio.middleware.sortMongooseQuery({title: 1})
      ],
      after: [
        router.formio.middleware.bootstrapNewRoleAccess,
        router.formio.middleware.filterResourcejsResponse(['deleted', '__v'])
      ]
    })),

    // The schema for roles.
    schema: RoleSchema
  };
};
