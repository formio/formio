'use strict';

const _ = require('lodash');

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);
  const util = router.formio.util;
  const ecode = router.formio.util.errorCodes;

  /**
   * RoleAction class.
   *   This class is used to create the Role action.
   */
  class RoleAction extends Action {
    static info(req, res, next) {
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
    }
    static async settingsForm(req, res, next) {
      const httpLogger = req.log.child({module: 'formio:action:role'});
      try {
        const roles = await router.formio.resources.role.model
        .find(hook.alter('roleQuery', {deleted: {$eq: null}}, req))
          .sort({title: 1})
          .lean()
          .exec();
          if (!roles) {
            httpLogger.info({code: ecode.role.EROLESLOAD}, 'No roles');
            return res.status(400).send(ecode.role.EROLESLOAD);
          }

          return next(null, [
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
      }
      catch (err) {
        httpLogger.error(err, ecode.role.EROLESLOAD);
        return res.status(400).send(ecode.role.EROLESLOAD);
      }
    }

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
    async resolve(handler, method, req, res, next) {
      const actionRoleLogger = req.log.child({module: 'formio:action:role'});
      const roleManipulationLogger = req.log.child({module: 'formio:action:role#roleManipulation'});
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
          'Missing role for RoleAction association of `existing`. Must specify role to assign in action settings ' +
          'or a form component named `role`'
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
      const loadUser = async function(submission, callback) {
        try {
          const submissionModel = req.submissionModel || router.formio.resources.submission.model;
          const user = await submissionModel.findOne(hook.alter('submissionQuery', {
            _id: util.idToBson(submission),
            deleted: {$eq: null}
          }, req)).exec();
          if (!user) {
            actionRoleLogger.error(ecode.submission.ENOSUB);
            return res.status(400).send('No Submission was found with the given setting `submission`.');
          }

          return callback(user);
        }
        catch (err) {
          actionRoleLogger.error(err, ecode.submission.ESUBLOAD);
          return res.status(400).send(err.message || err);
        }
      };

      // Determine the resources based on the current request.
      let resource = {};
      let role = {};
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
      const updateModel = async function(submission, association, update) {
        // Try to update the submission directly.
        req.log.info({module: 'formio:action:role#updateModel', association});

        const submissionModel = req.submissionModel || router.formio.resources.submission.model;
        try {
        await submissionModel.updateOne({
          _id: submission._id
        },
        update);
        return next();
      }
      catch (err) {
          actionRoleLogger.error(err, ecode.submission.ESUBSAVE);
          return next(err);
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
      const addRole = async function(role, submission, association) {
        req.log.info({module: 'formio:action:role#addRole'}, `Role: ${role}`);

        // The given role already exists in the resource.
        let compare = [];
        _.each(_.get(submission, 'roles'), function(element) {
          if (element) {
            compare.push(util.idToString(element));
          }
        });

        if (compare.indexOf(role) !== -1) {
          actionRoleLogger.info(ecode.role.EROLEEXIST);
          return next();
        }

        // Add and save the role to the submission.
        compare.push(role);
        compare = _.uniq(compare);
        compare.map(util.idToBson);
        submission.roles = compare;

        const update = {
          roles: compare
        };
        // Update the submission model.
        await updateModel(submission, association, update);
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
      const removeRole = async function(role, submission, association) {
        req.log.info({module: 'formio:action:role#removeRole'}, `Role: ${role}`);

        // The given role does not exist in the resource.
        let compare = [];
        if (Array.isArray(submission.roles)) {
          submission.roles.forEach(function(element) {
            if (element) {
              compare.push(util.idToString(element));
            }
          });
        }

        if (compare.indexOf(role) === -1) {
          actionRoleLogger.error({err: new Error('The given role to remove was not found.'), role}, ecode.role.ENOROLE);
          return next();
        }

        // Remove this role from the mongoose model and save.
        compare = _.uniq(_.pull(compare, role));
        compare.map(util.idToBson);
        submission.roles = compare;

        // Update the submission model.
        const update = {
          roles: compare
        };
       await updateModel(submission, association, update);
      };

      /**
       * Manipulate the roles based on the type.
       *
       * @param type
       *   The type of role manipulation.
       */
      const roleManipulation = async function(type, association) {
        roleManipulationLogger.info(`Type: ${type}`);

        // Confirm that the given/configured role is actually accessible.
        const query = hook.alter('roleQuery', {_id: role, deleted: {$eq: null}}, req);
        try {
          let role = await router.formio.resources.role.model.findOne(query).lean().exec();
          if (!role) {
            actionRoleLogger.error({
              err: new Error(ecode.role.ENOROLE),
              location: '#roleManipulation'},
            ecode.role.ENOROLE);
            return res.status(400).send(ecode.role.ENOROLE);
          }

          role = role._id.toString();
          roleManipulationLogger.info(role);
          if (type === 'add') {
            await addRole(role, resource, association);
          }
          else if (type === 'remove') {
            await removeRole(role, resource, association);
          }
        }
        catch (err) {
          actionRoleLogger.error({err, location: '#roleManipulation'}, ecode.role.EROLELOAD);
          return res.status(400).send(ecode.role.EROLELOAD);
        }
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
        loadUser(resource, async (user) => {
          resource = user;
          await roleManipulation(this.settings.type, this.settings.association);
        });
      }
      else {
        await roleManipulation(this.settings.type, this.settings.association);
      }
    }
  }

  // Return the RoleAction.
  return RoleAction;
};
