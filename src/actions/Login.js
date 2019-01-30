const bcrypt = require('bcrypt');
const Action = require('form-manager').Action;
const has = require('lodash/has');
const get = require('lodash/get');

module.exports = class Login extends Action {
  static info(req, res, next) {
    next(null, {
      name: 'login',
      title: 'Login',
      description: 'Provides a way to login to the application.',
      priority: 2,
      defaults: {
        handler: ['before'],
        method: ['create']
      },
      access: {
        handler: false,
        method: false
      }
    });
  }

  /**
   * Settings form for auth action.
   *
   * @param req
   * @param res
   * @param next
   */
  static settingsForm(req, res, next) {
    const basePath = hook.alter('path', '/form', req);
    const dataSrc = `${basePath}/${req.params.formId}/components`;
    next(null, [
      {
        type: 'select',
        input: true,
        label: 'Resources',
        key: 'resources',
        placeholder: 'Select the resources we should login against.',
        dataSrc: 'url',
        data: {url: `${basePath}?type=resource`},
        valueProperty: '_id',
        template: '<span>{{ item.title }}</span>',
        multiple: true,
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Username Field',
        key: 'username',
        placeholder: 'Select the username field',
        template: '<span>{{ item.label || item.key }}</span>',
        dataSrc: 'url',
        data: {url: dataSrc},
        valueProperty: 'key',
        multiple: false,
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Password Field',
        key: 'password',
        placeholder: 'Select the password field',
        template: '<span>{{ item.label || item.key }}</span>',
        dataSrc: 'url',
        data: {url: dataSrc},
        valueProperty: 'key',
        multiple: false,
        validate: {
          required: true
        }
      },
      {
        type: 'textfield',
        key: 'allowedAttempts',
        input: true,
        label: 'Maximum Login Attempts',
        description: 'Use 0 for unlimited attempts',
        defaultValue: '5'
      },
      {
        type: 'textfield',
        key: 'attemptWindow',
        input: true,
        label: 'Login Attempt Time Window',
        description: 'This is the window of time to count the login attempts.',
        defaultValue: '30',
        suffix: 'seconds'
      },
      {
        type: 'textfield',
        key: 'lockWait',
        input: true,
        label: 'Locked Account Wait Time',
        description: 'The amount of time a person needs to wait before they can try to login again.',
        defaultValue: '1800',
        suffix: 'seconds'
      }
    ]);
  }

  resolve(handler, method, req, res) {
    if (!req.body || !req.body.hasOwnProperty('data')) {
      return res.status(401).send('User or password was incorrect.');
    }

    // They must provide a username.
    if (!has(req.body.data, this.settings.username)) {
      return res.status(401).send('User or password was incorrect.');
    }

    // They must provide a password.
    if (!has(req.body.data, this.settings.password)) {
      return res.status(401).send('User or password was incorrect.');
    }

    const query = {
      form: {'$in': this.settings.resources.map(this.app.db.ID)},
      [`data.${this.settings.username}`]: get(req.body.data, this.settings.username),
    };

    return this.app.models.Submission.read(query)
      .then(user => {
        if (!user) {
          return Promise.reject('User or password was incorrect.');
        }

        if (!get(user.data, this.settings.password)) {
          return Promise.reject('Your account does not have a password. You must reset your password to login.');
        }

        return bcrypt.compare(get(req.body.data, this.settings.password), get(user.data, this.settings.password))
          .then(value => {
            if (!value) {
              return Promise.reject('User or password was incorrect.');
            }
            return this.app.models.Form.read({
              _id: this.app.db.ID(user.form),
            })
              .then(form => {
                req.user = user;
                res.token = this.app.generateToken(this.app.tokenPayload(user, form));
              });
          })
      });
  }
};
