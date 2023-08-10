'use strict';

const _ = require('lodash');
const bcrypt = require('bcryptjs');
// const util = require('../util/util');

module.exports = (router) => {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);

  class SecureSubmissionUpdateAction extends Action {
    static info(req, res, next) {
      next(null, {
        name: 'secureSubmissionUpdate',
        title: 'Secure Submission Update',
        description: 'Checks submitted password before allowing to update the submission.',
        priority: 11,
        defaults: {
          handler: ['before'],
          method: ['update'],
        },
        access: {
          handler: false,
          method: false,
        },
      });
    }

    /**
     * Action settings form.
     *
     * @param req
     * @param res
     * @param next
     */
    static settingsForm(req, res, next) {
      const basePath = hook.alter('path', '/form', req);
      const dataSrc = `${basePath}/${req.params.formId}/components?type=password`;

      next(null, [
        {
          type: 'select',
          input: true,
          label: 'Password Field',
          key: 'password',
          placeholder: 'Select the password input field',
          template: '<span>{{ item.label || item.key }}</span>',
          dataSrc: 'url',
          data: {url: dataSrc},
          valueProperty: 'key',
          multiple: false,
          validate: {
            required: true,
          },
        },
      ]);
    }

    /**
     *
     * @param handler
     * @param method
     * @param req {Object}
     *   The Express request object.
     * @param res {Object}
     *   The Express response object.
     * @param next {Function}
     *   The callback function to execute upon completion.
     */
    resolve(handler, method, req, res, next) {
      if (!this.settings.password) {
        return res.status(400).send('Missing password field configuration');
      }

      const password = _.get(req.submission.data, this.settings.password);

      if (!password) {
        return res.status(400).send('No password provided');
      }

      router.formio.cache.loadSubmission(
        req,
        req.formId,
        req.subId,
        (err, sub) => {
          if (err) {
            return next(err);
          }

          if (!sub) {
            return res.status(404).send('Submission not found');
          }

          const hash = _.get(sub.data, this.settings.password);

          // Compare the provided password.
          bcrypt.compare(password, hash, (err, value) => {
            if (err) {
              return next(err);
            }

            if (!value) {
              return res.status(403).send('Change not allowed: Incorrect password');
            }

            next();
          });
        }
      );
    }
  }

  return SecureSubmissionUpdateAction;
};
