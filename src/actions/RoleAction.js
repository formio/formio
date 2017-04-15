'use strict';

var _ = require('lodash');
var debug = {
  loadUser: require('debug')('formio:action:role#loadUser'),
  addRole: require('debug')('formio:action:role#addRole'),
  removeRole: require('debug')('formio:action:role#removeRole'),
  roleManipulation: require('debug')('formio:action:role#roleManipulation'),
  updateModel: require('debug')('formio:action:role#updateModel')
};

module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);
  var util = router.formio.util;

  /**
   * RoleAction class.
   *   This class is used to create the Role action.
   *
   * @constructor
   */
  var RoleAction = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  RoleAction.prototype = Object.create(Action.prototype);
  RoleAction.prototype.constructor = RoleAction;
  RoleAction.info = function(req, res, next) {
    next(null, {
      name: 'role',
      title: 'Role Assignment',
      description: 'Provides the Role Assignment capabilities.',
      priority: 1,
      defaults: {
        handler: ['after'],
        method: ['create']
      },
      access: {
        handler: false,
        method: false
      }
    });
  };
  RoleAction.settingsForm = function(req, res, next) {
    router.formio.resources.role.model.find(hook.alter('roleQuery', {deleted: {$eq: null}}, req))
      .sort({title: 1})
      .exec(function(err, roles) {
        if (err || !roles) {
          return res.status(400).send('Could not load the Roles.');
        }

        next(null, [
          {
            type: 'select',
            input: true,
            label: 'Resource Association',
            key: 'association',
            placeholder: 'Select the type of resource to perform role manipulation.',
            template: '<span>{{ item.title }}</span>',
            dataSrc: 'json',
            data: {
              json: JSON.stringify([
                {
                  association: 'existing',
                  title: 'Existing Resource'
                },
                {
                  association: 'new',
                  title: 'New Resource'
                }
              ])
            },
            valueProperty: 'association',
            multiple: false,
            validate: {
              required: true
            }
          },
          {
            type: 'select',
            input: true,
            label: 'Action Type',
            key: 'type',
            placeholder: 'Select whether this Action will Add or Remove the contained Role.',
            template: '<span>{{ item.title }}</span>',
            dataSrc: 'json',
            data: {
              json: JSON.stringify([
                {
                  type: 'add',
                  title: 'Add Role'
                },
                {
                  type: 'remove',
                  title: 'Remove Role'
                }
              ])
            },
            valueProperty: 'type',
            multiple: false,
            validate: {
              required: true
            }
          },
          {
            type: 'select',
            input: true,
            label: 'Role',
            key: 'role',
            placeholder: 'Select the Role that this action will Add or Remove.',
            template: '<span>{{ item.title }}</span>',
            dataSrc: 'json',
            data: {json: roles},
            valueProperty: '_id',
            multiple: false,
            validate: {
              required: true
            }
          }
        ]);
      });
  };

  /**
   * Add the roles to the user.
   *
   * @param handler
   *   TODO
   * @param method
   *   TODO
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param next
   *   The callback function to execute upon completion.
   */
  RoleAction.prototype.resolve = function(handler, method, req, res, next) {
    // Check the submission for the submissionId.
    if (this.settings.association !== 'existing' && this.settings.association !== 'new') {
      return res.status(400).send('Invalid setting `association` for the RoleAction; expecting `new` or `existing`.');
    }
    // Error if operation type is not valid.
    if (!this.settings.type || (this.settings.type !== 'add' && this.settings.type !== 'remove')) {
      return res.status(400).send('Invalid setting `type` for the RoleAction; expecting `add` or `remove`.');
    }
    // Error if no resource is being returned.
    if (
      this.settings.association === 'new' &&
      res.hasOwnProperty('resource') &&
      !res.resource.item && this.settings.role
    ) {
      return res.status(400).send('Invalid resource was provided for RoleAction association of `new`.');
    }
    // Error if association is existing and valid data was not provided.
    if (this.settings.association === 'existing' && !(this.settings.role || req.submission.data.role)) {
      return res.status(400).send(
        'Missing role for RoleAction association of `existing`. Must specify role to assign in action settings or a ' +
        'form component named `role`'
      );
    }
    if (this.settings.association === 'existing' && !(req.submission.data.submission || res.resource.item)) {
      return res.status(400).send(
        'Missing submission for RoleAction association of `existing`. Form must have a resource field named ' +
        '`submission`.'
      );
    }

    /**
     * Using the current request, load the user for role manipulations.
     *
     * @param submission
     *   The submission id.
     * @param callback
     * @returns {*}
     */
    var loadUser = function(submission, callback) {
      debug.loadUser(submission);
      router.formio.resources.submission.model.findById(submission, function(err, user) {
        if (err) {
          return res.status(400).send(err.message || err);
        }
        if (!user) {
          return res.status(400).send('No Submission was found with the given setting `submission`.');
        }

        debug.loadUser(user);
        return callback(user);
      });
    };

    // Determine the resources based on the current request.
    var resource = {};
    var role = {};
    if (this.settings.association === 'existing') {
      resource = req.submission.data.submission || res.resource.item;
      role = this.settings.role
        ? this.settings.role
        : req.submission.data.role;
    }
    else if (this.settings.association === 'new') {
      resource = res.resource.item;
      role = this.settings.role;
    }

    /**
     * Attempts to save the submission. Will load the submission if not currently loaded.
     *
     * @param submission
     */
    var updateModel = function(submission, association) {
      // Try to update the submission directly.
      debug.updateModel(association);
      if (typeof submission.save === 'function') {
        submission.save(function(err) {
          if (err) {
            debug.updateModel(err);
            return next(err);
          }

          return next();
        });
      }
    };

    /**
     * Add the role to the given submission object.
     *
     * @param role
     *   The RoleId in mongo.
     * @param submission
     *   The mongoose submission object to be mutated.
     * @returns {*}
     */
    var addRole = function(role, submission, association) {
      debug.addRole('Role: ' + role);

      // The given role already exists in the resource.
      var compare = [];
      _.each(_.get(submission, 'roles'), function(element) {
        if (element) {
          compare.push(util.idToString(element));
        }
      });

      if (compare.indexOf(role) !== -1) {
        debug.addRole('The given role to add was found in the current list of roles already.');
        return next();
      }

      // Add and save the role to the submission.
      compare.push(role);
      compare = _.uniq(compare);
      compare.map(util.idToBson);
      submission.roles = compare;

      // Update the submission model.
      debug.addRole(submission);
      updateModel(submission, association);
    };

    /**
     * Remove the role from the given submission object.
     *
     * @param role
     *   The RoleId in mongo.
     * @param submission
     *   The mongoose submission object to be mutated.
     * @returns {*}
     */
    var removeRole = function(role, submission, association) {
      debug.removeRole('Role: ' + role);

      // The given role does not exist in the resource.
      var compare = [];
      submission.roles.forEach(function(element) {
        if (element) {
          compare.push(util.idToString(element));
        }
      });

      if (compare.indexOf(role) === -1) {
        debug.removeRole('The given role to remove was not found.');
        return next();
      }

      // Remove this role from the mongoose model and save.
      compare = _.uniq(_.pull(compare, role));
      compare.map(util.idToBson);
      submission.roles = compare;

      // Update the submission model.
      debug.removeRole(submission);
      updateModel(submission, association);
    };

    /**
     * Manipulate the roles based on the type.
     *
     * @param type
     *   The type of role manipulation.
     */
    var roleManipulation = function(type, association) {
      debug.roleManipulation('Type: ' + type);

      // Confirm that the given/configured role is actually accessible.
      var query = hook.alter('roleQuery', {_id: role, deleted: {$eq: null}}, req);
      router.formio.resources.role.model.findOne(query, function(err, role) {
        if (err || !role) {
          return res.status(400).send('The given role was not found.');
        }

        role = role.toObject()._id.toString();
        debug.roleManipulation(role);
        if (type === 'add') {
          addRole(role, resource, association);
        }
        else if (type === 'remove') {
          removeRole(role, resource, association);
        }
      });
    };

    /**
     * Prepare to load existing resource
     */
    if (typeof resource === 'object' && resource.hasOwnProperty('_id')) {
      resource = resource._id;
    }

    /**
     * Resolve the action.
     */
    if (typeof resource === 'string') {
      loadUser(resource, function(user) {
        resource = user;
        roleManipulation(this.settings.type, this.settings.association);
      }.bind(this));
    }
    else {
      roleManipulation(this.settings.type, this.settings.association);
    }
  };

  // Return the RoleAction.
  return RoleAction;
};
