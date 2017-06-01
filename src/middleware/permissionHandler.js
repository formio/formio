'use strict';

var util = require('../util/util');
var async = require('async');
var _ = require('lodash');

var _debug = require('debug');
var debug = {
  permissions: _debug('formio:permissions'),
  getSubmissionResourceAccess: _debug('formio:permissions:getSubmissionResourceAccess'),
  getAccess: {
    getFormAccess: _debug('formio:permissions:getAccess#getFormAccess'),
    getSubmissionAccess: _debug('formio:permissions:getAccess#getSubmissionAccess'),
    flagRequest: _debug('formio:permissions:getAccess#flagRequest')
  }
};

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);

  /**
   * Convert the submissions resource access into the common roles/permissions format for processing during the request.
   *
   * @param {Object} req
   *   The express request object.
   * @param {Object} submission
   *   The submission.
   * @param {Object} access
   *   The compiled access list.
   * @param {Function} next
   *   The callback function to invoke with the results.
   */
  var getSubmissionResourceAccess = function(req, submission, access, next) {
    if (!next) {
      debug.getSubmissionResourceAccess('No next fn given.');
      return;
    }
    if (!submission || !access) {
      debug.getSubmissionResourceAccess('No submission (' + !!submission + ') or access (' + !!access + ') given.');
      return next();
    }
    if (!_.has(submission, 'access')) {
      debug.getSubmissionResourceAccess('No submission access defined');
      return next();
    }

    /* eslint-disable camelcase */
    async.each(submission.access, function(permission, callback) {
      // Only process the permission if it's in the correct format.
      if (!_.has(permission, 'type') || !_.has(permission, 'resources')) {
        debug.getSubmissionResourceAccess('Unknown permissions format');
        return callback();
      }

      // Coerce all the resource ids into strings.
      permission.resources = _(permission.resources).map(util.idToString).uniq().value();
      debug.getSubmissionResourceAccess(permission);

      // Ensure the submission access permissions are defined before accessing them.
      access.submission = access.submission || {};
      access.submission.read_all = access.submission.read_all || [];
      access.submission.update_all = access.submission.update_all || [];
      access.submission.delete_all = access.submission.delete_all || [];

      // Convert the simplex read/write/admin rules into *_all permissions.
      if (permission.type === 'read') {
        _.each(permission.resources, function(id) {
          access.submission.read_all.push(id);
        });
      }
      else if (permission.type === 'write') {
        _.each(permission.resources, function(id) {
          access.submission.read_all.push(id);
          access.submission.update_all.push(id);

          // Flag this request as not having admin access through submission resource access.
          req.submissionResourceAccessAdminBlock = req.submissionResourceAccessAdminBlock || [];
          req.submissionResourceAccessAdminBlock.push(util.idToString(id));
        });
      }
      else if (permission.type === 'admin') {
        _.each(permission.resources, function(id) {
          access.submission.read_all.push(id);
          access.submission.update_all.push(id);
          access.submission.delete_all.push(id);
        });
      }
      else {
        debug.getSubmissionResourceAccess('Unknown permission type...');
        debug.getSubmissionResourceAccess(permission);
      }

      callback();
    }, function(err) {
      // Force all the permissions to be unique, even if an error occurred.
      access.submission.read_all = _(access.submission.read_all).uniq().value();
      access.submission.update_all = _(access.submission.update_all).uniq().value();
      access.submission.delete_all = _(access.submission.delete_all).uniq().value();
      debug.getSubmissionResourceAccess('Updated submission access');

      if (err) {
        return next(err);
      }

      next();
    });
    /* eslint-enable camelcase */
  };

  /**
   * Attempts to add Self Access Permissions if present in the form access.
   *
   * @param {Object} req
   *   The express request object.
   * @param {Object} form
   *   The form definition.
   * @param {Object} access
   *   The compiled access list.
   */
  var getSelfAccessPermissions = function(req, form, access) {
    if (!form || !access || !form.submissionAccess || !(form.submissionAccess instanceof Array)) {
      return;
    }

    // Check for self submission flag.
    var done = false;
    for (var a = 0; a < form.submissionAccess.length; a++) {
      // Only search while not found.
      if (done) {
        break;
      }

      if (form.submissionAccess[a].hasOwnProperty('type') && form.submissionAccess[a].type === 'self') {
        done = true;

        // Flag the request for self access, so that the submission permission handler can add it in.
        req.selfAccess = true;

        // Remove the self access type, so we dont disturb the regular _all/_own permissions.
        delete form.submissionAccess[a];
        form.submissionAccess = _.filter(form.submissionAccess);
      }
    }
  };

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
          access.form = access.form || {};
          access.submission = access.submission || {};
          access.role = access.role || {};

          // Skip form access if no formId was given.
          if (!req.formId) {
            debug.getAccess.getFormAccess('Skipping, no req.formId');
            access.form['read_own'] = !req.projectId;
            return callback(null);
          }

          // Load the form, and get its roles/permissions data.
          router.formio.cache.loadForm(req, null, req.formId, function(err, item) {
            if (err) {
              debug.getAccess.getFormAccess(err);
              return callback(err);
            }
            if (!item) {
              debug.getAccess.getFormAccess('No Form found with formId: ' + req.formId);
              return callback('No Form found with formId: ' + req.formId);
            }

            // If this a Resource, search for the presence of Self Access Permissions.
            if (item.type === 'resource') {
              // Attempt to load the Self Access Permissions.
              getSelfAccessPermissions(req, item, access);
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

                // If the user has update_all permissions, give them create_all access also, to compensate for the
                // hidden availability of create_all in the formio ui.
                if (permission.type === 'update_all') {
                  access.submission.create_all = access.submission.create_all || []; //eslint-disable-line camelcase
                }

                permission.roles.forEach(function(id) {
                  // Add each roleId to the role array for this access type.
                  access.submission[permission.type].push(id.toString());

                  // If the user has update_all permissions, give them create_all access also, to compensate for the
                  // hidden availability of create_all in the formio ui.
                  if (permission.type === 'update_all') {
                    access.submission.create_all.push(id.toString()); //eslint-disable-line camelcase
                  }
                });
              });
            }

            // Return the updated access list.
            return callback(null);
          });
        },

        // Get the permissions for a Submission with the given ObjectId.
        function getSubmissionAccess(callback) {
          access.submission = access.submission || {};

          // Skip submission access if no subId was given.
          if (!req.subId) {
            debug.getAccess.getSubmissionAccess('Skipping, no req.subId');
            return callback(null);
          }

          // Get the submission by request id and query its access.
          router.formio.cache.loadSubmission(req, req.formId, req.subId, function(err, submission) {
            if (err) {
              debug.getAccess.getSubmissionAccess(err);
              return callback(400);
            }

            // No submission exists.
            if (!submission) {
              debug.getAccess.getSubmissionAccess('No submission found w/ _id: ' + req.subId);
              return callback(404);
            }

            // Add the submission owners UserId to the access list.
            access.submission.owner = submission.owner
              ? submission.owner.toString()
              : null;

            // Add self access if previously defined.
            if (req.selfAccess && req.selfAccess === true) {
              // Add the submission id to the access entity.
              access.submission._id = util.idToString(submission._id);
            }

            // Load Submission Resource Access.
            getSubmissionResourceAccess(req, submission, access, callback);
          });
        },

        // Determine if this is a possible index request against submissions.
        function flagRequestAsSubmissionResourceAccess(callback) {
          if (req.method !== 'GET') {
            debug.getAccess.flagRequest('Skipping, request type not GET ' + req.method);
            return callback();
          }

          if (!req.formId || req.subId) {
            var message = 'Skipping, no req.formId (' + !req.formId + ') or req.subId (' + req.subId + ')';
            debug.getAccess.flagRequest(message);
            return callback();
          }

          if (!_.has(req, 'user._id')) {
            debug.getAccess.flagRequest('Skipping, no req.user._id (' + req.user + ')');
            return callback();
          }

          var user = req.user._id;
          var search = [util.idToBson(user)];
          hook.alter('resourceAccessFilter', search, req, function(err, search) {
            // Try to recover if the hook fails.
            if (err) {
              debug.getAccess.flagRequest(err);
            }

            var query = {
              form: util.idToBson(req.formId),
              deleted: {$eq: null},
              $or: [
                {
                  'access.type': {$in: ['read', 'write', 'admin']},
                  'access.resources': {$in: search}
                }
              ]
            };

            router.formio.resources.submission.model.count(query, function(err, count) {
              if (err) {
                debug.getAccess.flagRequest(err);
                return callback();
              }

              debug.getAccess.flagRequest('count: ' + count);
              if (count > 0) {
                req.submissionResourceAccessFilter = true;

                // Since the access is now determined by the submission resource access, we
                // can skip the owner filter.
                req.skipOwnerFilter = true;
              }

              callback();
            });
          });
        }
      ], req, res, access), function(err) {
        if (err) {
          debug.permissions(err);
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
            debug.permissions(err);
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
     * @param res {Object}
     *   The Express response Object.
     *
     * @returns boolean
     *   If the user has access to this method, with their given roles.
     */
    /* eslint-disable max-statements */
    hasAccess: function(req, access, entity, res) {
      var method = req.method.toUpperCase();

      // Determine the roles and user based on the available token.
      var roles = [access.defaultRole];
      var user = null;
      if (req.user) {
        user = util.idToString(req.user._id);

        // Get the roles for the permission checks.
        req.user.roles = req.user.roles || [];

        // If the user actually has roles, remove the default role and check their access using their roles.
        if (req.user.roles.length > 0) {
          // Add the users id to the roles to check for submission resource access.
          req.user.roles.push(user);

          // Ensure that all roles are strings to be compatible for comparison.
          roles = _(req.user.roles)
            .filter()
            .map(util.idToString)
            .uniq()
            .value();
        }
      }

      // Setup some flags for other handlers.
      req.isAdmin = false;
      req.ownerAssign = false;

      // Check to see if this user has an admin role.
      var hasAdminRole = access.adminRole ? (_.indexOf(roles, access.adminRole) !== -1) : false;
      if (hasAdminRole || hook.alter('isAdmin', req.isAdmin, req)) {
        req.isAdmin = true;
        debug.permissions('Admin: true');
        return true;
      }

      // See if we have an anonymous user with the default role included in the create_all access.
      if (
        access.submission.hasOwnProperty('create_all') &&
        (_.intersection(access.submission.create_all, roles).length > 0)
      ) {
        debug.permissions('Assign Owner: true');
        req.ownerAssign = true;
      }

      debug.permissions('req.submissionResourceAccessAdminBlock: ' + req.submissionResourceAccessAdminBlock);
      debug.permissions('Checking access for method: ' + method);
      debug.permissions('Checking access for user: ' + user);

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
        debug.permissions('This request is being made by the owner, Access Granted.');
        _hasAccess = true;
      }

      // Using the given method, iterate the 8 available entity access. Compare the given roles with the roles
      // defined by the entity to have access. If this roleId is found within the defined roles, grant access.
      var search = methods[method];
      if (!search || typeof search === 'undefined') {
        router.formio.util.error({
          method: req.method,
          _method: method
        });
      }

      // Unsupported request method.
      if (search === undefined) {
        if (res) {
          res.sendStatus(404);
        }
        return false;
      }

      search.forEach(function(type) {
        // Check if the given roles are contained within the allowed roles for our
        roles.forEach(function(role) {
          // Grant access if the role was found in the access for this resource.
          if (
            access.hasOwnProperty(entity.type)
            && access[entity.type].hasOwnProperty(type)
            &&
            (
              (access[entity.type][type] === true) ||
              (access[entity.type][type] instanceof Array && access[entity.type][type].indexOf(role) !== -1)
            )
          ) {
            // Allow anonymous users to create a submission for themselves if defined.
            if (type === 'create_own') {
              _hasAccess = true;
            }
            else if (type.toString().indexOf('_own') !== -1) {
              // Entity has an owner, Request is from a User, and the User is the Owner.
              // OR, selfAccess was flagged, and the user is the entity.
              /* eslint-disable max-len */
              if (
                (access[entity.type].hasOwnProperty('owner') && user && access[entity.type].owner === user)
                || (req.selfAccess && user && access[entity.type].hasOwnProperty('_id') && user.toString() === access[entity.type]._id.toString())
              ) {
                _hasAccess = true;
              }
              // Exception for Index endpoint, the
              else if (type === 'read_own' && entity.hasOwnProperty('id') && entity.id === '') {
                // The user has access to this endpoint, however the results will need to be filtered by the
                // ownerFilter middleware.
                _hasAccess = true;
              }
              /* eslint-enable max-len */
            }
            else {
              // If the current request has been flagged for submission resource access (admin permissions).
              var submissionResourceAdmin = (_.get(req, 'submissionResourceAccessAdminBlock') || []);

              // Only allow certain users to edit the owner and submission access property.
              // (~A | B) logic for submission access, to not affect old permissions.
              if (
                (type === 'create_all' || type === 'update_all')
                && submissionResourceAdmin.indexOf(util.idToString(role)) === -1
              ) {
                // Only allow the the bootstrapEntityOwner middleware to assign an owner if defined in the payload.
                if (_.has(req, 'body.owner')) {
                  req.assignOwner = true;
                }

                // Only allow the the bootstrapSubmissionAccess middleware to assign access if defined in the payload.
                if (entity.type === 'submission' && _.has(req, 'body.access')) {
                  req.assignSubmissionAccess = true;
                }
              }

              // No ownership requirements here.
              req.skipOwnerFilter = true;
              _hasAccess = true;
            }
          }

          debug.permissions('----------------------------------------------------');
          debug.permissions('type: ' + type);
          debug.permissions('role: ' + role);
          debug.permissions('_hasAccess: ' + _hasAccess);
          debug.permissions('selfAccess: ' + req.selfAccess);
        });
      });

      // No prior access was granted, the given role does not have access to this resource using the given method.
      debug.permissions('assignOwner: ' + req.assignOwner);
      debug.permissions('assignSubmissionAccess: ' + req.assignSubmissionAccess);
      debug.permissions('req.submissionResourceAccessFilter: ' + req.submissionResourceAccessFilter);
      debug.permissions('hasAccess: ' + _hasAccess);
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
    if (req.method === 'GET') {
      var whitelist = ['/health', '/current', '/logout', '/access', '/token'];
      var skip = _.some(whitelist, function(path) {
        if ((req.url === path) || (req.url === hook.alter('path', path, req))) {
          return true;
        }

        return false;
      });

      // Allow the private hook of skip to be run, if it didnt already pass the whitelist.
      if (!skip) {
        skip = hook.alter('skip', false, req);
      }

      // If there is a whitelist match, then move onto the next middleware.
      debug.permissions(req.url);
      if (skip) {
        debug.permissions('Skipping');
        return next();
      }
    }

    // Determine if we are trying to access and entity of the form or submission.
    router.formio.access.getAccess(req, res, function(err, access) {
      if (err) {
        debug.permissions(err);
        if (_.isNumber(err)) {
          return res.sendStatus(err);
        }

        return res.status(400).send(err.message || err);
      }

      // Check for permissions starting at micro -> macro level.
      var entity = null;
      if (req.hasOwnProperty('subId') && ((req.subId !== null) && (req.subId !== undefined))) {
        debug.permissions('Checking access for the Submission.');
        entity = {
          type: 'submission',
          id: req.subId
        };
      }
      else if (req.hasOwnProperty('formId') && ((req.formId !== null) && (req.formId !== undefined))) {
        debug.permissions('Checking access for the Form.');
        entity = {
          type: 'form',
          id: req.formId
        };
      }
      else if (req.hasOwnProperty('roleId') && ((req.roleId !== null) && (req.roleId !== undefined))) {
        debug.permissions('Checking access for the Role.');
        entity = {
          type: 'role',
          id: req.roleId
        };
      }

      // Allow anyone to hook and change the access entity.
      entity = hook.alter('accessEntity', entity, req);

      // Check for access.
      if (router.formio.access.hasAccess(req, access, entity, res)) {
        debug.permissions('Access Granted!');
        return next();
      }

      // Allow anyone to hook the access check.
      if (hook.alter('hasAccess', false, req, access, entity, res)) {
        debug.permissions('Access Granted!');
        return next();
      }

      // Attempt a final access check against submission index requests using the submission resource access.
      // If this passes, it is up to the submissionResourceAccessFilter middleware to handle permissions.
      if (_.has(req, 'submissionResourceAccessFilter') && req.submissionResourceAccessFilter) {
        /* eslint-disable max-len */
        debug.permissions('Granting access because req.submissionResourceAccessFilter: ' + req.submissionResourceAccessFilter);
        /* eslint-enable max-len */
        req.skipOwnerFilter = true;
        return next();
      }

      // If someone else before this sent the status, then go to the next middleware.
      debug.permissions('Access Denied!');
      return res.headersSent ? next() : res.sendStatus(401);
    });
  };
};
