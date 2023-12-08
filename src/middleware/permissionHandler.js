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
      access.submission.create_all = access.submission.create_all || [];
      access.submission.update_all = access.submission.update_all || [];
      access.submission.delete_all = access.submission.delete_all || [];

      // Convert the simplex read/create/write/admin rules into *_all permissions.
      if (permission.type === 'read') {
        _.each(permission.resources, function(id) {
          access.submission.read_all.push(id);

          // Flag this request as not having admin access through submission resource access.
          req.submissionResourceAccessAdminBlock = req.submissionResourceAccessAdminBlock || [];
          req.submissionResourceAccessAdminBlock.push(util.idToString(id));
        });
      }
      else if (permission.type === 'create') {
        _.each(permission.resources, function(id) {
          access.submission.create_all.push(id);

          // Flag this request as not having admin access through submission resource access.
          req.submissionResourceAccessAdminBlock = req.submissionResourceAccessAdminBlock || [];
          req.submissionResourceAccessAdminBlock.push(util.idToString(id));
        });
      }
      else if (permission.type === 'update') {
        _.each(permission.resources, function(id) {
          access.submission.update_all.push(id);

          // Flag this request as not having admin access through submission resource access.
          req.submissionResourceAccessAdminBlock = req.submissionResourceAccessAdminBlock || [];
          req.submissionResourceAccessAdminBlock.push(util.idToString(id));
        });
      }
      else if (permission.type === 'delete') {
        _.each(permission.resources, function(id) {
          access.submission.delete_all.push(id);
        });
      }
      else if (permission.type === 'write') {
        _.each(permission.resources, function(id) {
          access.submission.read_all.push(id);
          access.submission.create_all.push(id);
          access.submission.update_all.push(id);

          // Flag this request as not having admin access through submission resource access.
          req.submissionResourceAccessAdminBlock = req.submissionResourceAccessAdminBlock || [];
          req.submissionResourceAccessAdminBlock.push(util.idToString(id));
        });
      }
      else if (permission.type === 'admin') {
        _.each(permission.resources, function(id) {
          access.submission.read_all.push(id);
          access.submission.create_all.push(id);
          access.submission.update_all.push(id);
          access.submission.delete_all.push(id);
        });
      }

      callback();
    }, function(err) {
      // Force all the permissions to be unique, even if an error occurred.
      access.submission.read_all = _(access.submission.read_all).uniq().value();
      access.submission.create_all = _(access.submission.create_all).uniq().value();
      access.submission.update_all = _(access.submission.update_all).uniq().value();
      access.submission.delete_all = _(access.submission.delete_all).uniq().value();

      const adminAccess = _.chain(access.submission.delete_all)
        .intersection(access.submission.update_all)
        .intersection(access.submission.create_all)
        .intersection(access.submission.read_all)
        .uniq()
        .value();

      if (_.intersection(req.submissionResourceAccessAdminBlock, adminAccess).length) {
        req.submissionResourceAccessAdminBlock = _.filter(req.submissionResourceAccessAdminBlock, function(el) {
          adminAccess.includes(el);
        });
      }

      if (err) {
        return next(err);
      }

      next();
    });
    /* eslint-enable camelcase */
  };

  const getSubmissionFieldMatchAccess = function(req, submission, access) {
    if (!submission || !access) {
      return;
    }
    // If the form has no Field Match Access permissions or it is an index request
    if (!req.submissionFieldMatchAccess || req.submissionFieldMatchAccessFilter === true) {
      return;
    }

    const userRoles = access.roles;

    // Allowed actions for each permission level
    const permissions = {
      read: ['read_all'],
      create: ['create_all'],
      update: ['update_all'],
      delete: ['delete_all'],
      write: ['read_all', 'create_all', 'update_all'],
      admin: ['read_all', 'create_all', 'update_all', 'delete_all']
    };

    const isConditionMet = (value, formFieldValue, operator) => {
      switch (operator) {
        case '$eq':
          return value === formFieldValue;
        case '$gte':
          return (formFieldValue >= value);
        case '$lte':
          return (formFieldValue <= value);
        case '$gt':
          return (formFieldValue > value);
        case '$lt':
          return (formFieldValue < value);
        case '$in':
          return Array.isArray(value) ? _.find(value, formFieldValue) : false;
      }
    };

    const grantAccess = (permissionLevel, roles) => {
      if (permissions[permissionLevel]) {
        permissions[permissionLevel].forEach((right) => {
          if (access.submission[right]) {
            access.submission[right].push(...roles);
            access.submission[right] = _(access.submission[right]).uniq().value();
          }
        });
      }
    };

    // Iterate through each permission level
    Object.entries(req.submissionFieldMatchAccess).forEach(([permissionLevel, conditions]) => {
      if (!Array.isArray(conditions)) {
        return;
      }
      // Iterate through each condition within a permission level
      conditions.forEach((condition) => {
        // Get intersection of roles within condition and the user's roles
        const rolesIntersection = _.intersectionWith(condition.roles, userRoles, (role, userRole) => {
          return role.toString() === userRole.toString();
        }).map((role) => role.toString());

        // If the user has a role specified in condition
        if (rolesIntersection.length) {
          const {formFieldPath, operator, value, valueType} = condition;
          const formFieldValue = _.get(submission, formFieldPath);
          if (isConditionMet(util.castValue(valueType, value), formFieldValue, operator)) {
            grantAccess(permissionLevel, rolesIntersection);
          }
        }
      });
    });
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

  const getAccessBasedOnMethod = function(req, item, access, roles) {
    util.eachComponent(item.components, (component, path) => {
      if (component && component.key && (component.submissionAccess || component.defaultPermission)) {
        if (!component.submissionAccess) {
          component.submissionAccess = [
            {
              type: component.defaultPermission,
              roles: [],
            },
          ];
        }

        let selectValue = _.get(req.body.data, path);
        if (selectValue) {
          if (!Array.isArray(selectValue)) {
            selectValue = [selectValue];
          }

          const createAccess = component.submissionAccess
            .filter(({type}) => (roles.includes(type)))
            .map((access) => ({
              ...access,
              roles: _.compact(access.roles || []),
            }));

          selectValue.filter((value) => (value && value._id)).forEach(({_id}) => {
            createAccess.forEach(({roles}) => {
              /* eslint-disable camelcase */
              access.submission.create_all = (access.submission.create_all || []).concat(
                roles.length
                  ? roles.map((role) => (`${_id}:${role}`))
                  : _id,
              );
              /* eslint-enable camelcase */
            });
          });
        }
      }
    });
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

            // Attempt to load the Self Access Permissions.
            getSelfAccessPermissions(req, item, access);

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

            // check for group permissions, only if creating submission (POST request)
            if (req.method === 'POST') {
              getAccessBasedOnMethod(req, item, access, ['create', 'write', 'admin']);
            }

            if (req.method === 'DELETE') {
              getAccessBasedOnMethod(req, item, access, ['delete', 'admin']);
            }

            if (req.method === 'PUT' || req.method === 'PATCH') {
              getAccessBasedOnMethod(req, item, access, ['update', 'write', 'admin']);
            }

            // Return the updated access list.
            return callback(null);
          });
        },

        // Get a list of all roles associated with this access check.
        function getAccessRoles(callback) {
          // Load all the roles.
          router.formio.resources.role.model.find(hook.alter('roleQuery', {
            deleted: {$eq: null}
          }, req), function(err, roles) {
            if (err) {
              return callback(400);
            }

            const validRoles = (roles && roles.length) ? roles.map((role) => {
              const roleId = role._id.toString();
              if (role.default) {
                access.defaultRole = roleId;
              }
              if (role.admin) {
                access.adminRole = roleId;
              }
              return roleId;
            }) : [];

            if (access.primaryAdminRole) {
              validRoles.push(access.primaryAdminRole);
            }

            // Default the access roles.
            access.roles = [access.defaultRole];

            // Ensure the user only has valid roles.
            if (req.user) {
              let userRoles = _.clone(access.roles);
              userRoles = _(req.user.roles || [])
                .filter()
                .map(util.idToString)
                .intersection(validRoles)
                .uniq()
                .value();

              if (req.user._id && (req.user._id !== 'external')) {
                userRoles.push(req.user._id.toString());
              }

              userRoles = hook.alter('userRoles', userRoles, access.defaultRole, req);
              access.roles =_.clone( userRoles);
            }

            // Add the EVERYONE role.
            access.roles.push(EVERYONE);
            req.accessRoles = access.roles;
            callback();
          });
        },

        // Load the form and set Field Match Access conditions to the request
        function setSubmissionFieldMatchAccessToRequest(callback) {
          if (!req.formId) {
            return callback(null);
          }
          router.formio.cache.loadForm(req, null, req.formId, function(err, item) {
            if (err) {
              return callback(err);
            }
            if (!item) {
              return callback(`No Form found with formId: ${req.formId}`);
            }

            if (item.fieldMatchAccess && !_.isEmpty(item.fieldMatchAccess)) {
              req.submissionFieldMatchAccess = item.fieldMatchAccess;
            }
            return callback(null);
          });
        },

        // Mark the index request to be proccessed by SubmissionFieldMatchAccessFilter
        function flagIndexRequestAsSubmissionFieldMatchAccess(callback) {
          const isIndexRequest = (req) => req.method.toUpperCase() === 'GET' && req.formId && !req.subId;
          if (!isIndexRequest(req)) {
            return callback(null);
          }

          if (req.submissionFieldMatchAccess && _.isObject(req.submissionFieldMatchAccess)) {
            const hasRoles = Object.keys(req.submissionFieldMatchAccess).some(accessKey => {
              if (!Array.isArray(req.submissionFieldMatchAccess[accessKey])) {
                return false;
              }
              return req.submissionFieldMatchAccess[accessKey].some(item=>{
                return item.roles.some(role => req.accessRoles.includes(role.toString()));
              });
            });
            req.submissionFieldMatchAccessFilter = hasRoles;
          }
          return callback(null);
        },

        // Get the permissions for a Submission with the given ObjectId.
        function getSubmissionAccess(callback) {
          access.submission = access.submission || {};

          // Skip submission access if no subId was given.
          if (!req.subId) {
            // Still need to check if the user allowed to create submissions withing Field Match Access
            getSubmissionFieldMatchAccess(req, req.body, access);
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
            // Load Submission Field Match Access.
            getSubmissionFieldMatchAccess(req, submission, access);
            // Load Submission Resource Access.
            getSubmissionResourceAccess(req, submission, access, callback);
          });
        },

        // Determine if this is a possible index request against submissions.
        function flagRequestAsSubmissionResourceAccess(callback) {
          if (req.method.toUpperCase() !== 'GET') {
            return callback();
          }

          if (!req.formId || req.subId) {
            return callback();
          }

          // Does not apply if the user doesn't have any roles.
          const userRoles = _.get(req, 'user.roles', []);
          if (!userRoles.length) {
            return callback();
          }

          // Load the form, and get its roles/permissions data.
          router.formio.cache.loadForm(req, null, req.formId, function(err, item) {
            if (err) {
              return callback(err);
            }
            if (!item) {
              return callback(`No Form found with formId: ${req.formId}`);
            }

            // See if any of our components have "submissionAccess" or "defaultPermission" established.
            util.eachComponent(item.components, (component) => {
              if (component.submissionAccess || component.defaultPermission) {
                req.skipOwnerFilter = true;
                req.submissionResourceAccessFilter = true;
                return true;
              }
            });

            return callback();
          });
        }
      ], req, res, access), function(err) {
        if (err) {
          return done(err);
        }

        done(null, access);
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
      let user = req.user ? util.idToString(req.user._id) : null;

      user = hook.alter('twoFAuthenticatedUser', user, req);
      // Setup some flags for other handlers.
      req.isAdmin = false;

      // Determine access based on the given access method.
      const methods = {
        'POST': {all: 'create_all', own: 'create_own'},
        'GET': {all: 'read_all', own: 'read_own'},
        'PUT': {all: 'update_all', own: 'update_own'},
        'PATCH': {all: 'update_all', own: 'update_own'},
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
      const hasAdminRole = access.adminRole ? (_.indexOf(access.roles, access.adminRole) !== -1) : false;
      if (hasAdminRole || hook.alter('isAdmin', req.isAdmin, req)) {
        req.isAdmin = true;
        return true;
      }

      // Check to see if this user has an admin role of the primary project.
      const hasPrimaryAdminRole = access.primaryAdminRole
        ? (_.indexOf(access.roles, access.primaryAdminRole) !== -1)
        : false;

      if (hasPrimaryAdminRole) {
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
            (access[entity.type][type].length && _.intersection(access[entity.type][type], access.roles).length)
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
          !_.intersection(submissionResourceAdmin, access.roles).length
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

        // Do not include the submission resource access and field match access filters if they have "all" access.
        req.submissionResourceAccessFilter = false;
        req.submissionFieldMatchAccessFilter = false;
        _hasAccess = true;
      }

      // If resource access or field match access applies, then allow for that to be in the query.
      if (_.has(req, 'submissionResourceAccessFilter') && req.submissionResourceAccessFilter ||
      _.has(req, 'submissionFieldMatchAccessFilter') && req.submissionFieldMatchAccessFilter) {
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
    let skip = false;
    if (req.method === 'GET') {
      const whitelist = ['/health', '/current', '/logout', '/access', '/token', '/recaptcha'];
      const url = req.url.split('?')[0];
      skip = _.some(whitelist, function(path) {
        if ((url === path) || (url === hook.alter('path', path, req))) {
          return true;
        }

        return false;
      });
    }

    // Allow the private hook of skip to be run, if it didnt already pass the whitelist.
    if (!skip) {
      skip = hook.alter('skip', false, req);
    }

    // If there is a whitelist match, then move onto the next middleware.
    if (skip) {
      return next();
    }

    // Determine if we are trying to access an entity of the form or submission.
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
      // TODO: ask Travis if these lines are redundant
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
