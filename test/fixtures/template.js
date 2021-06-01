'use strict';

let _ = require('lodash');
const defaultEmail = process.env.DEFAULT_EMAIL_SOURCE || 'no-reply@example.com';

module.exports = () => {
  // The default project template.
  let template = _.cloneDeep(require('../../src/templates/default.json'));

  // Change the login timeouts for testing
  template.actions['adminLogin:login'].settings.lockWait = 4;
  template.actions['adminLogin:login'].settings.attemptWindow = 4;
  template.actions['userLogin:login'].settings.lockWait = 4;
  template.actions['userLogin:login'].settings.attemptWindow = 4;

  // Create a registration form for admins for testing purposes.
  template.forms.adminRegister = {
    title: 'Admin Register',
    name: 'adminRegister',
    path: 'admin/register',
    type: 'form',
    tags: [],
    access: [
      {
        type: 'read_all',
        roles: ['anonymous']
      }
    ],
    submissionAccess: [
      {
        type: 'create_own',
        roles: ['anonymous']
      }
    ],
    components: [
      {
        type: 'email',
        persistent: true,
        unique: false,
        protected: false,
        defaultValue: '',
        suffix: '',
        prefix: '',
        placeholder: 'Enter your email address',
        key: 'email',
        label: 'Email',
        inputType: 'email',
        tableView: true,
        input: true
      },
      {
        type: 'password',
        persistent: true,
        protected: true,
        suffix: '',
        prefix: '',
        placeholder: 'Enter your password.',
        key: 'password',
        label: 'Password',
        inputType: 'password',
        tableView: false,
        input: true
      },
      {
        theme: 'primary',
        disableOnInvalid: true,
        action: 'submit',
        block: false,
        rightIcon: '',
        leftIcon: '',
        size: 'md',
        key: 'submit',
        label: 'Submit',
        input: true,
        type: 'button'
      }
    ]
  };

  // Create an email template.
  template.actions['user:email'] = {
    name: 'email',
    title: 'Email',
    form: 'user',
    priority: 0,
    method: ['create'],
    handler: ['after'],
    settings: {
      transport: 'test',
      from: defaultEmail,
      emails: '{{ data.email }}',
      subject: 'New user {{ _id }} created',
      message: 'Email: {{ data.email }}'
    }
  };

  // Create a register action for this form.
  template.actions['adminRegister:save'] = {
    name: 'save',
    title: 'Save Submission',
    form: 'adminRegister',
    priority: 11,
    method: ['create', 'update'],
    handler: ['before'],
    settings: {
      resource: 'admin',
      fields: {
        email: 'email',
        password: 'password'
      }
    }
  };

  template.actions['adminRegister:login'] = {
    name: 'login',
    title: 'Login',
    form: 'adminRegister',
    priority: 2,
    method: ['create'],
    handler: ['before'],
    settings: {
      resources: ['admin'],
      username: 'email',
      password: 'password',
      allowedAttempts: 5,
      attemptWindow: 10,
      lockWait: 10
    }
  };

  // Create some circularly dependent resources to make sure
  // importing this doesn't crash
  template.resources.a = {
    title: 'A',
    type: 'resource',
    name: 'a',
    path: 'a',
    tags: [],
    components: [
      {
        input: true,
        tableView: true,
        label: 'B',
        key: 'b',
        placeholder: 'B',
        resource: 'b',
        defaultValue: '',
        template: '<span>{{ item.data }}</span>',
        selectFields: '',
        searchFields: '',
        multiple: false,
        protected: false,
        persistent: true,
        validate: {
          required: false
        },
        type: 'resource'
      }
    ],
    access: [],
    submissionAccess: []
  };

  template.resources.b = {
    title: 'B',
    type: 'resource',
    name: 'b',
    path: 'b',
    tags: [],
    components: [
      {
        isNew: false,
        type: 'resource',
        validate: {
          required: false
        },
        persistent: true,
        protected: false,
        multiple: false,
        searchFields: '',
        selectFields: '',
        template: '<span>{{ item.data }}</span>',
        defaultValue: '',
        resource: 'a',
        placeholder: 'A',
        key: 'a',
        label: 'A',
        tableView: true,
        input: true
      }
    ],
    access: [],
    submissionAccess: []
  };

  // Add some users.
  template.users = {
    // An owner of the project.
    admin: {
      token: '',
      data: {
        email: 'admin@example.com',
        password: 'test123'
      }
    },

    // A administrator of this User-created Project.
    admin2: {
      token: '',
      data: {
        email: 'admin2@example.com',
        password: 'test123'
      }
    },

    // A user of this User-created Project.
    user1: {
      token: '',
      data: {
        email: 'user1@example.com',
        password: 'test123'
      }
    },

    // A user of this User-created Project.
    user2: {
      token: '',
      data: {
        email: 'user2@example.com',
        password: 'test123'
      }
    }
  };

  return template;
};
