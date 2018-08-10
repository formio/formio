'use strict';

const util = require('../util/util');
const async = require('async');
const _ = require('lodash');
const EVERYONE = '000000000000000000000000';

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);

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
  const getSubmissionResourceAccess = function(req, submission, access, next) {
    if (!next) {
      return;
    }
    if (!submission || !access) {
      return next();
    }
    if (!_.has(submission, 'access')) {
      return next();
    }

    /* eslint-disable camelcase */
    async.each(submission.access, function(permission, callback) {
      // Only process the permission if it's in the correct format.
      if (!_.has(permission, 'type') || !_.has(permission, 'resources')) {
        return callback();
      }

      // Coerce all the resource ids into strings.
      permission.resources = _(permission.resources).map(util.idToString).uniq().value();

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

      callback();
    }, function(err) {
      // Force all the permissions to be unique, even if an error occurred.
      access.submission.read_all = _(access.submission.read_all).uniq().value();
      access.submission.update_all = _(access.submission.update_all).uniq().value();
      access.submission.delete_all = _(access.submission.delete_all).uniq().value();

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
  const getSelfAccessPermissions = function(req, form, access) {
    if (!form || !access || !form.submissionAccess || !(form.submissionAccess instanceof Array)) {
      return;
    }

    // Check for self submission flag.
    let done = false;
    for (let a = 0; a < form.submissionAccess.length; a++) {
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
    getAccess(req, res, done) {
      const access = {};
      async.series(hook.alter('getAccess', [
        // Get the permissions for a Form and Submissions with the given ObjectId.
        function getFormAccess(callback) {
          access.form = access.form || {};
          access.submission = access.submission || {};
          access.role = access.role || {};

          // Skip form access if no formId was given.
          if (!req.formId) {
            access.form['read_own'] = !req.projectId;
            return callback(null);
          }

          // Load the form, and get its roles/permissions data.
          router.formio.cache.loadForm(req, null, req.formId, function(err, item) {
            if (err) {
              return callback(err);
            }
            if (!item) {
              return callback(`No Form found with formId: ${req.formId}`);
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
            return callback(null);
          }

          // Get the submission by request id and query its access.
          router.formio.cache.loadSubmission(req, req.formId, req.subId, function(err, submission) {
            if (err) {
              return callback(400);
            }

            // No submission exists.
            if (!submission) {
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
            return callback();
          }

          if (!req.formId || req.subId) {
            return callback();
          }

          if (!_.has(req, 'user._id')) {
            return callback();
          }

          const user = req.user._id;
          const search = [util.idToBson(user)];
          hook.alter('resourceAccessFilter', search, req, function(err, search) {
            // Try to recover if the hook fails.
            if (err) {
              return callback();
            }

            const query = {
              form: util.idToBson(req.formId),
              deleted: {$eq: null},
              $or: [
                {
                  'access.type': {$in: ['read', 'write', 'admin']},
                  'access.resources': {$in: search}
                }
              ]
            };

            const submissionModel = req.submissionModel || router.formio.resources.submission.model;
            submissionModel.countDocuments(query, function(err, count) {
              if (err) {
                return callback();
              }

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
          return done(err);
        }

        // Load a specific role.
        const loadRole = function(name, query, done) {
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
    hasAccess(req, access, entity, res) {
      const method = req.method.toUpperCase();
      let roles = [access.defaultRole, EVERYONE];
      let user = null;
      if (req.user) {
        user = util.idToString(req.user._id);

        // Get the roles for the permission checks.
        req.user.roles = req.user.roles || [];

        // If the user actually has roles, remove the default role and check their access using their roles.
        if (req.user.roles.length > 0) {
          // Add the users id to the roles to check for submission resource access.
          req.user.roles.push(user);

          // Add the everyone role.
          req.user.roles.push(EVERYONE);

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

      // Determine access based on the given access method.
      const methods = {
        'POST': {all: 'create_all', own: 'create_own'},
        'GET': {all: 'read_all', own: 'read_own'},
        'PUT': {all: 'update_all', own: 'update_own'},
        'DELETE': {all: 'delete_all', own: 'delete_own'}
      };

      // Using the given method, iterate the 8 available entity access. Compare the given roles with the roles
      // defined by the entity to have access. If this roleId is found within the defined roles, grant access.
      const search = methods[method];
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

      // Check to see if this user has an admin role.
      const hasAdminRole = access.adminRole ? (_.indexOf(roles, access.adminRole) !== -1) : false;
      if (hasAdminRole || hook.alter('isAdmin', req.isAdmin, req)) {
        req.isAdmin = true;
        return true;
      }

      // There should be an entity at this point.
      if (!entity || !access.hasOwnProperty(entity.type)) {
        return false;
      }

      // Determine the typed access.
      var typedAccess = function(type) {
        return access[entity.type][type] &&
          (
            (access[entity.type][type] === true) ||
            (access[entity.type][type].length && _.intersection(access[entity.type][type], roles).length)
          );
      };

      // See if the user is the owner.
      const isOwner = user && (user === access[entity.type].owner);
      const isIndex = (method === 'GET') && entity.hasOwnProperty('id') && (entity.id === '');
      const isPost = (method === 'POST') && entity.hasOwnProperty('id') && (entity.id === '');
      const hasOwnAccess = typedAccess(search.own);
      const hasAllAccess = typedAccess(search.all);
      let _hasAccess = false;

      // Check for self access.
      if (
        user &&
        (
          (req.selfAccess && (user === access[entity.type]._id) && hasOwnAccess) ||
          (isOwner && (user === entity.id))
        )
      ) {
        _hasAccess = true;
      }

      // Check for all access.
      if (hasAllAccess) {
        const submissionResourceAdmin = (_.get(req, 'submissionResourceAccessAdminBlock') || []);
        if (
          (req.method === 'POST' || req.method === 'PUT') &&
          !_.intersection(submissionResourceAdmin, roles).length
        ) {
          // Allow them to assign the owner.
          req.assignOwner = true;

          // Only allow the the bootstrapSubmissionAccess middleware to assign access if defined in the payload.
          if (entity.type === 'submission' && _.has(req, 'body.access')) {
            req.assignSubmissionAccess = true;
          }
        }

        // Skip the owner filter if they have all access.
        req.skipOwnerFilter = true;
        _hasAccess = true;
      }

      // Check for own access.
      if (hasOwnAccess && (isOwner || isIndex || isPost)) {
        _hasAccess = true;
      }

      // Return if they have access.
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
    // If permissions have already been checked.
    if (req.permissionsChecked) {
      return next();
    }
    req.permissionsChecked = true;

    // Check for whitelisted paths.
    if (req.method === 'GET') {
      const whitelist = ['/health', '/current', '/logout', '/access', '/token'];
      let skip = _.some(whitelist, function(path) {
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
      if (skip) {
        return next();
      }
    }

    // Determine if we are trying to access and entity of the form or submission.
    router.formio.access.getAccess(req, res, function(err, access) {
      if (err) {
        if (_.isNumber(err)) {
          return (typeof res.sendStatus === 'function') ? res.sendStatus(err) : next('Invalid Request');
        }

        return res.status(400).send(err.message || err);
      }

      // Check for permissions starting at micro -> macro level.
      let entity = null;
      if (req.hasOwnProperty('subId') && ((req.subId !== null) && (req.subId !== undefined))) {
        entity = {
          type: 'submission',
          id: req.subId
        };
      }
      else if (req.hasOwnProperty('formId') && ((req.formId !== null) && (req.formId !== undefined))) {
        entity = {
          type: 'form',
          id: req.formId
        };
      }
      else if (req.hasOwnProperty('roleId') && ((req.roleId !== null) && (req.roleId !== undefined))) {
        entity = {
          type: 'role',
          id: req.roleId
        };
      }

      // Allow anyone to hook and change the access entity.
      entity = hook.alter('accessEntity', entity, req);

      // Check for access.
      if (router.formio.access.hasAccess(req, access, entity, res)) {
        return next();
      }

      // Allow anyone to hook the access check.
      if (hook.alter('hasAccess', false, req, access, entity, res)) {
        return next();
      }

      // Attempt a final access check against submission index requests using the submission resource access.
      // If this passes, it is up to the submissionResourceAccessFilter middleware to handle permissions.
      if (_.has(req, 'submissionResourceAccessFilter') && req.submissionResourceAccessFilter) {
        req.skipOwnerFilter = true;
        return next();
      }

      // If someone else before this sent the status, then go to the next middleware.
      if (req.noResponse) {
        res.status(401);
        return next();
      }
      return res.headersSent ? next() : res.sendStatus(401);
    });
  };
};
