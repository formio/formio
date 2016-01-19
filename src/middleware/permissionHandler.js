'use strict';

var util = require('../util/util');
var async = require('async');
var _ = require('lodash');
var debug = require('debug')('formio:permissions');

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);

  // Add this access handlers for all to use.
  router.formio.access = {

    /**
     * Get the access for all defined entities.
     *
     * @param req {Object}
     *   The Express request Object.
     * @param res {Object}
     *   The Express request Object.
     * @param done
     *   The callback function to invoke after completion.
     *
     * @return
     *   The access object for the given form/sub id.
     */
    getAccess: function(req, res, done) {
      var access = {};
      async.series(hook.alter('getAccess', [
        // Get the permissions for a Form and Submissions with the given ObjectId.
        function getFormAccess(callback) {
          var _debug = require('debug')('formio:permissions:getAccess#getFormAccess');

          access.form = access.form || {};
          access.submission = access.submission || {};

          // Skip form access if no formId was given.
          if (!req.formId) {
            _debug('Skipping, no req.formId');
            return callback(null);
          }

          // Load the form, and get its roles/permissions data.
          router.formio.cache.loadForm(req, null, req.formId, function(err, item) {
            if (err) {
              _debug(err);
              return callback(err);
            }
            if (!item) {
              _debug('No Form found with formId: ' + req.formId);
              return callback('No Form found with formId: ' + req.formId);
            }

            // Add the defined access types for the form.
            if (item.access) {
              // Add the submission owners UserId to the access list.
              access.form.owner = item.owner
                ? item.owner.toString()
                : null;

              item.access.forEach(function(permission) {
                // Define this access type.
                access.form[permission.type] = access.form[permission.type] || [];

                permission.roles.forEach(function(id) {
                  // Add each roleId to the role array for this access type.
                  access.form[permission.type].push(id.toString());
                });
              });
            }

            // Add the defined access types for the form submissions.
            if (item.submissionAccess) {
              item.submissionAccess.forEach(function(permission) {
                // Define this access type.
                access.submission[permission.type] = access.submission[permission.type] || [];

                permission.roles.forEach(function(id) {
                  // Add each roleId to the role array for this access type.
                  access.submission[permission.type].push(id.toString());
                });
              });
            }

            // Return the updated access list.
            _debug(JSON.stringify(access));
            return callback(null);
          });
        },

        // Get the permissions for a Submission with the given ObjectId.
        function getSubmissionAccess(callback) {
          var _debug = require('debug')('formio:permissions:getAccess#getSubmissionAccess');
          access.submission = access.submission || {};

          // Skip submission access if no subId was given.
          if (!req.subId) {
            _debug('Skipping, no req.subId');
            return callback(null);
          }

          // Get the submission by request id and query its access.
          router.formio.cache.loadSubmission(req, req.formId, req.subId, function(err, submission) {
            if (err) {
              _debug(err);
              return callback(400);
            }

            // No submission exists.
            if (!submission) {
              _debug('No submission found w/ _id: ' + req.subId);
              return callback(404);
            }

            // Add the submission owners UserId to the access list.
            access.submission.owner = submission.owner
              ? submission.owner.toString()
              : null;

            // Return the updated access list.
            _debug(JSON.stringify(access));
            return callback(null);
          });
        }
      ], req, res, access), function(err) {
        if (err) {
          debug(err);
          return done(err);
        }

        // Load a specific role.
        var loadRole = function(name, query, done) {
          // Load the default role.
          access[name] = hook.alter(name, null, access);
          if (access[name]) {
            done(null, access);
          }
          else {
            // Load the default role.
            router.formio.resources.role.model.findOne(hook.alter('roleQuery', query, req), function(err, role) {
              if (err) {
                return done(err);
              }

              if (role) {
                access[name] = role._id.toString();
              }

              done(null, access);
            });
          }
        };

        // Load all of the applicable roles.
        async.series([
          async.apply(loadRole, 'defaultRole', {default: true}),
          async.apply(loadRole, 'adminRole', {admin: true})
        ], function(err) {
          if (err) {
            debug(err);
            return done(err);
          }

          done(null, access);
        });
      });
    },

    /**
     * Checks if the given set of roles has the permissions to perform the given method.
     *
     * @param req {Object}
     *   The Express request Object.
     * @param access {Object}
     *   An object of access with the associated roles.
     * @param entity {Object}
     *   The entity within the permissions object to use.
     *
     * @returns boolean
     *   If the user has access to this method, with their given roles.
     */
    /* eslint-disable max-statements */
    hasAccess: function(req, access, entity) {
      var method = req.method.toUpperCase();

      // Determine the roles and user based on the available token.
      var roles = [access.defaultRole];
      var user = null;
      if (req.user) {
        user = req.user._id;

        // Get the roles for the permission checks.
        req.user.roles = req.user.roles || [];
        if (req.user.roles.length > 0) {
          debug('User Roles: ' + JSON.stringify(req.user.roles));

          // Ensure that all roles are strings to be compatible for comparison.
          roles = _.uniq(_.map(_.filter(req.user.roles), util.idToString));
        }
      }

      // Setup some flags for other handlers.
      req.isAdmin = false;

      // Check to see if this user has an admin role.
      var hasAdminRole = access.adminRole ? (_.indexOf(roles, access.adminRole) !== -1) : false;
      if (hasAdminRole || hook.alter('isAdmin', req.isAdmin, req)) {
        req.isAdmin = true;
        debug('Admin: true');
        return true;
      }

      debug('Checking access for roles: ' + JSON.stringify(roles));
      debug('Checking access for access: ' + JSON.stringify(access));
      debug('Checking access for entity: ' + JSON.stringify(entity));
      debug('Checking access for method: ' + method);
      debug('Checking access for user: ' + user);

      // There should be an entity at this point.
      if (!entity) {
        return false;
      }

      // The return value of user access.
      var _hasAccess = false;

      // Determine access based on the given access method.
      var methods = {
        'POST': ['create_all', 'create_own'],
        'GET': ['read_all', 'read_own'],
        'PUT': ['update_all', 'update_own'],
        'DELETE': ['delete_all', 'delete_own']
      };

      // Check if the user making the request owns the entity being requested.
      if (
        user
        && access.hasOwnProperty(entity.type)
        && access[entity.type].hasOwnProperty('owner')
        && req.token.user._id === access[entity.type].owner
      ) {
        _hasAccess = true;
      }

      // Using the given method, iterate the 8 available entity access. Compare the given roles with the roles
      // defined by the entity to have access. If this roleId is found within the defined roles, grant access.
      var search = methods[method];

      debug('Search: ' + JSON.stringify(search));
      if (!search || typeof search === 'undefined') {
        router.formio.util.error({
          method: req.method,
          _method: method
        });
      }

      search.forEach(function(type) {
        // Check if the given roles are contained within the allowed roles for our
        roles.forEach(function(role) {
          // Grant access if the role was found in the access for this resource.
          if (
            access.hasOwnProperty(entity.type)
            && access[entity.type].hasOwnProperty(type)
            && access[entity.type][type] instanceof Array
            && access[entity.type][type].indexOf(role) !== -1
          ) {
            // Allow anonymous users to create a submission for themselves if defined.
            if (type === 'create_own') {
              _hasAccess = true;
            }
            else if (type.toString().indexOf('_own') !== -1) {
              // Entity has an owner, Request is from a User, and the User is the Owner.
              if (access[entity.type].hasOwnProperty('owner') && user && access[entity.type].owner === user) {
                _hasAccess = true;
              }
              // Exception for Index endpoint, the
              else if (type === 'read_own' && !Boolean(entity.id) && entity.id === '') {
                // The user has access to this endpoint, however the results will need to be filtered by the
                // ownerFilter middleware.
                _hasAccess = true;
              }
            }
            else {
              // Only allow the the bootstrapEntityOwner middleware to assign an owner if defined in the payload.
              if (
                (type === 'create_all' || type === 'update_all')
                && req.body
                && req.body.hasOwnProperty('owner')
                && req.body.owner
              ) {
                req.assignOwner = true;
              }

              // No ownership requirements here.
              req.skipOwnerFilter = true;
              _hasAccess = true;
            }
          }
        });
      });

      // No prior access was granted, the given role does not have access to this resource using the given method.
      debug('assignOwner: ' + req.assignOwner);
      debug('hasAccess: ' + _hasAccess);
      return _hasAccess;
    }
    /* eslint-enable max-statements */
  };

  /**
   * The Form.io permissions middleware.
   *
   * This middleware will confirm that the request has permissions to perform its request.
   *
   * @param req {Object}
   *   The Express request Object.
   * @param res {Object}
   *   The Express request Object.
   * @param next {Function}
   *   The callback function to invoke after completion.
   */
  return function permissionHandler(req, res, next) {
    // Check for whitelisted paths.
    var whitelist = ['/health', '/current', '/logout'];
    var skip = _.any(whitelist, function(path) {
      if ((req.url === path) || (req.url === hook.alter('url', path, req))) {
        return true;
      }

      return false;
    });

    // If there is a whitelist match, then move onto the next middleware.
    debug(req.url);
    if (skip) {
      debug('Skipping');
      return next();
    }

    // Determine if we are trying to access and entity of the form or submission.
    router.formio.access.getAccess(req, res, function(err, access) {
      if (err) {
        debug(err);
        if (_.isNumber(err)) {
          return res.sendStatus(err);
        }

        return res.status(400).send(err.message || err);
      }

      // Check for permissions starting at micro -> macro level.
      var entity = null;
      if (req.hasOwnProperty('subId') && ((req.subId !== null) && (req.subId !== undefined))) {
        debug('Checking access for the Submission.');
        entity = {
          type: 'submission',
          id: req.subId
        };
      }
      else if (req.hasOwnProperty('formId') && ((req.formId !== null) && (req.formId !== undefined))) {
        debug('Checking access for the Form.');
        entity = {
          type: 'form',
          id: req.formId
        };
      }

      // Allow anyone to hook and change the access entity.
      entity = hook.alter('accessEntity', entity, req);

      // Check for access.
      if (router.formio.access.hasAccess(req, access, entity)) {
        debug('Access Granted!');
        return next();
      }

      // Allow anyone to hook the access check.
      if (hook.alter('hasAccess', false, req, access, entity)) {
        debug('Access Granted!');
        return next();
      }

      // If someone else before this sent the status, then go to the next middleware.
      debug('Access Denied!');
      return res.headersSent ? next() : res.sendStatus(401);
    });
  };
};
