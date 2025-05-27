/* eslint-disable max-statements */
'use strict';

const request = require('./formio-supertest');
var chance = new (require('chance'))();
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var docker = process.env.DOCKER;

module.exports = function(app) {
  // The Helper class.
  var Helper = function(owner, template, hook) {
    this.contextName = '';
    this.lastSubmission = null;
    this.lastResponse = null;
    this.owner = owner;
    this.series = [];
    this.expects = [];
    this.template = template || {
      project: null,
      forms: {},
      actions: {},
      submissions: {},
      roles: {},
      users: {}
    };
    this.hook = hook;
  };

  Helper.prototype.perms = function(permissions) {
    const permsConfig = [];
    _.each(permissions, (roles, name) => {
      permsConfig.push({
        type: name,
        roles: _.map(roles, (roleName) => {
          return this.template.roles[roleName]._id.toString()
        })
      });
    });
    return permsConfig;
  };

  Helper.prototype.getExport = function(form, format, done) {
    let url = '';
    if (this.template.project && this.template.project._id) {
      url += `/project/${this.template.project._id}`;
    }
    url += `/form/${form._id}/export?format=${format || 'csv'}`;

    request(app)
      .get(url)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', format === 'json' ? /json/ : 'text/csv')
      .expect(200)
      .end((err, res) => {
        this.owner.token = res.headers['x-jwt-token'];
        done(err, res);
      })
  };

  Helper.prototype.getTemplate = function() {
    return this.template;
  };

  // Return the last submission made.
  Helper.prototype.getLastSubmission = function() {
    return this.lastSubmission;
  };

  Helper.prototype.getForms = function(done) {
    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form?limit=9999';
    request(app)
      .get(url)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        _.each(res.body, (form) => {
          this.template.forms[form.name] = form;
        });
        this.lastResponse = res;
        this.owner.token = res.headers['x-jwt-token'];
        done(null, this.template.forms);
      });
  };

  Helper.prototype.getForm = function(name) {
    if (this.template.forms.hasOwnProperty(name)) {
      return this.template.forms[name];
    }

    return null;
  };

  Helper.prototype.getActions = function(form, done) {
    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + this.template.forms[form]._id + '/action';
    request(app)
      .get(url)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err, res);
        }
        if (!res.body) {
          return done('No response', res)
        }

        this.lastResponse = res;
        this.owner.token = res.headers['x-jwt-token'];
        this.template.actions[form] = [];
        for (var i = 0; i < res.body.length; i++) {
          this.template.actions[form].push(res.body[i]);
        }

        done(null, res.body);
      });
  };

  Helper.prototype.getAction = function(form, action) {
    if (!action && form) {
      if (typeof form ==='string') {
        form = {
          title: form
        };
      }

      action = form;
      form = this.contextName;
    }
    if (!action._id && !action.title) {
      return undefined;
    }

    var _action;
    this.template.actions[form] = this.template.actions[form] || [];
    this.template.actions[form].forEach(function(a) {
      if (_action) {
        return;
      }

      // NOTE: Titles are not unique for actions, use only when positive one exists.
      if (a.title === action.title || a._id === action._id) {
        _action = a;
        return;
      }
    });

    return _action;
  };

  Helper.prototype.deleteAction = function(form, action, done) {
    this.getActions(form, (err, actions) => {
      if (err) {
        return done(err);
      }

      let _action;
      actions.forEach((a) => {
        if (a.title === action.title || a._id === action._id) {
          _action = a;
          return;
        }
      });
      if (_action) {
        var url = '';
        if (this.template.project && this.template.project._id) {
          url += '/project/' + this.template.project._id;
        }
        url += '/form/' + this.template.forms[form]._id + '/action/' + _action._id;

        request(app)
          .delete(url)
          .set('x-jwt-token', this.owner.token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err, res);
            }
            if (!res.body) {
              return done('No response', res)
            }

            this.lastResponse = res;
            this.owner.token = res.headers['x-jwt-token'];
            _.remove(this.template.actions[form], {_id: _action._id});
            done();
          });
      }
      else {
        return done('Action not found');
      }
    });
  };

  Helper.prototype.getRoles = function(done) {
    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/role?limit=9999';

    // Get the roles created for this project.
    request(app)
      .get(url)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        // Assign the roles.
        assert.equal(res.body.length, 3);
        _.each(res.body, (role) => {
          if (role.admin) {
            this.template.roles.administrator = role;
          }
          else if (role.default) {
            this.template.roles.anonymous = role;
          }
          else {
            this.template.roles.authenticated = role;
          }
        });
        assert.equal(Object.keys(this.template.roles).length, 3);
        this.owner.token = res.headers['x-jwt-token'];
        this.lastResponse = res;
        done(null, this.template.roles);
      });
  };

  /**
   * Get a role by its title.
   *
   * @param title
   * @returns {*|undefined}
   */
  Helper.prototype.getRole = function(title) {
    this.template.roles = this.template.roles || {};
    return this.template.roles[title] || undefined;
  };

  Helper.prototype.getRolesAndForms = function(done) {
    async.series([
      async.apply(this.getForms.bind(this)),
      async.apply(this.getRoles.bind(this))
    ], (err) => {
      if (err) {
        return done(err);
      }
      done(null, this.template);
    });
  };

  Helper.prototype.getProject = function(done) {
    if (!app.hasProjects && !docker) {
      return done('No project');
    }
    if (!this.template.project) {
      return done('No project');
    }

    request(app)
      .get('/project/' + this.template.project._id)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        this.lastResponse = res;
        this.template.project = res.body;
        return done(null, res.body);
      });
  };

  Helper.prototype.createProject = function(settings, done) {
    if (app.hasProjects || docker) {
      request(app)
        .post('/project')
        .send({
          title: chance.word(),
          name: chance.word(),
          description: chance.sentence(),
          settings: settings !== undefined ? settings : {}
        })
        .set('x-jwt-token', this.owner.token)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          this.lastResponse = res;
          this.template.project = res.body;
          this.getRolesAndForms((err) => {
            if (err) {
              return done(err);
            }
            return done(null, res.body);
          });
        });
    }
    else {
      this.getRolesAndForms((err) => {
        if (err) {
          return done(err);
        }
        return done(null, this.template);
      });
    }
  };

  Helper.prototype.project = function(settings) {
    this.series.push(async.apply(this.createProject.bind(this), settings));
    return this;
  };

  Helper.prototype.updateForm = function(form, done) {
    let url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + form._id;

    request(app).put(url)
      .send(_.omit(form, 'modified'))
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err, res);
        }
        this.owner.token = res.headers['x-jwt-token'];
        this.template.forms[form.name] = res.body;
        done(null, res.body);
      });
  }

  Helper.prototype.upsertForm = function(form, done) {
    this.contextName = form.name;

    // If no access is provided, then use the default.
    if (!form.hasOwnProperty('access')) {
      form.access = [];
    }
    if (!form.hasOwnProperty('submissionAccess')) {
      form.submissionAccess = [];
    }

    // Convert the role names to role ids.
    ['access', 'submissionAccess'].forEach(accessName =>
      _.each(form[accessName], (perm, i) =>
        _.each(perm.roles, (permRole, j) => {
          if (this.template.roles.hasOwnProperty(permRole)) {
            form[accessName][i].roles[j] = this.template.roles[permRole]._id;
          }
        })
      )
    );

    var method = 'post';
    var status = 201;
    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form';
    var data = {
      title: form.name,
      name: form.name,
      path: form.name,
      type: form.type,
      access: form.access,
      submissionAccess: form.submissionAccess,
      components: form.components,
      display: form.display || 'form'
    };
    if (this.template.forms.hasOwnProperty(form.name)) {
      method = 'put';
      status = 200;
      url += '/' + this.template.forms[form.name]._id;
      data = {
        components: form.components
      };

      // Allow upsert to modify machineNames
      if (form.hasOwnProperty('machineName')) {
        data.machineName = form.machineName;
      }
    }
    request(app)[method](url)
      .send(data)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(status)
      .end((err, res) => {
        if (err) {
          return done(err, res);
        }
        this.lastResponse = res;
        this.owner.token = res.headers['x-jwt-token'];
        this.template.forms[form.name] = res.body;
        done(null, res.body);
      });
  };

  Helper.prototype.form = function(name, components, access) {
    var form;
    if (typeof name !== 'string') {
      // If the first param is an array, its components.
      if (name instanceof Array) {
        form = form || {};
        form.components = name;
      }
      else {
        form = name;
      }

      // parse out the name or make one.
      form = form || {};
      name = form.name || chance.word();
    }
    else {
      form = form || {};
      form.name = name;
    }

    if (components instanceof Array) {
      form = form || {};
      form.components = components;
    }
    if (access) {
      form = form || {};
      if (access.hasOwnProperty('access') && access.access instanceof Array) {
        form.access = access.access;
      }
      if (access.hasOwnProperty('submissionAccess') && access.submissionAccess instanceof Array) {
        form.submissionAccess = access.submissionAccess;
      }
    }

    form = form || {};
    form.name = form.name || chance.word();
    form.type = form.type || 'form';
    form.components = form.components || [];
    form.access = form.access || [];
    form.submissionAccess = form.submissionAccess || [];

    this.series.push(async.apply(this.upsertForm.bind(this), form));
    return this;
  };

  Helper.prototype._deleteForm = function(_id, done) {
    if (this.template.forms.hasOwnProperty(_id)) {
      _id = this.template.forms[_id]._id.toString();
    }
    let url = '/form/' + _id;
    if (this.hook) {
      url = this.hook.alter('url', url, this.template);
    }
    request(app)
      .delete(url)
      .set('x-jwt-token', this.owner.token)
      .expect(200)
      .end(done);
  };

  Helper.prototype.deleteForm = function(form) {
    var _id = form._id || form;

    this.series.push(async.apply(this._deleteForm.bind(this), _id));
    return this;
  };

  Helper.prototype.resource = function(name, components, access) {
    var resource = {
      type: 'resource'
    };

    if (typeof name === 'string') {
      resource.name = name;
    }
    if (name instanceof Array) {
      resource.components = name;
    }

    return this.form.call(this, resource, components, access);
  };

  /**
   * Chainable method to create an adhoc role.
   *
   * @param role
   * @returns {Helper}
   */
  Helper.prototype.role = function(role, update) {
    if (update) {
      this.series.push(async.apply(this.upsertRole.bind(this), role, update));
      return this;
    }

    this.series.push(async.apply(this.upsertRole.bind(this), role));
    return this;
  };

  Helper.prototype.updateAction = function(form, action, done) {
    if (!this.template.actions.hasOwnProperty(form)) {
      return done('No actions exist for the given form.');
    }

    var _action = this.getAction.call(this, form, action);
    if (!_action) {
      return done('No action could be found.');
    }
    if (!_action.hasOwnProperty('_id')) {
      return done('Could not determine which action to modify.');
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + this.template.forms[form]._id + '/action/' + _action._id;

    request(app)
      .put(url)
      .send(action)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err, res);
        }
        if (!res.body) {
          return done('No response', res)
        }

        this.lastResponse = res;
        this.owner.token = res.headers['x-jwt-token'];
        for (var a = 0; a < this.template.actions[form].length; a++) {
          if (
            this.template.actions[form][a]._id === _action._id
            || this.template.actions[form][a].name === _action.name
          ) {
            this.template.actions[form][a] = res.body;
            break;
          }
        }

        done(null, res.body);
      });
  };

  Helper.prototype.createAction = function(form, action, done) {
    if (typeof form === 'object') {
      action = form;
      form = this.contextName;
    }

    if (!this.template.forms.hasOwnProperty(form)) {
      return done('Form not found');
    }

    var _action = this.getAction(form, {_id: action._id});
    if (_action) {
      return this.updateAction(form, action, done);
    }

    if (action.settings) {
      if (action.settings.resources) {
        var resources = [];
        _.each(action.settings.resources, resource => {
          if (this.template.forms.hasOwnProperty(resource)) {
            resources.push(this.template.forms[resource]._id);
          }
        });
        action.settings.resources = resources;
      }

      if (action.settings.resource) {
        if (this.template.forms.hasOwnProperty(action.settings.resource)) {
          action.settings.resource = this.template.forms[action.settings.resource]._id;
        }
      }

      if (action.settings.role && this.template.roles.hasOwnProperty(action.settings.role)) {
        action.settings.role = this.template.roles[action.settings.role]._id;
      }
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + this.template.forms[form]._id + '/action';

    request(app)
      .post(url)
      .send(action)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(201)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        this.lastResponse = res;
        this.owner.token = res.headers['x-jwt-token'];
        if (!this.template.actions[form]) {
          this.template.actions[form] = [];
        }
        this.template.actions[form].push(res.body);
        done(null, res.body);
      });
  };

  Helper.prototype.action = function(form, action) {
    this.series.push(async.apply(this.createAction.bind(this), form, action));
    return this;
  };

  Helper.prototype.removeAction = function(form, action) {
    this.series.push(async.apply(this.deleteAction.bind(this), form, action));
    return this;
  };

  Helper.prototype.updateSubmission = function(submission, user, expect, done) {
    if (typeof user === 'function') {
      done = user;
      user = this.owner;
    }

    if (typeof expect === 'function') {
      done = expect;
      expect = [];
    }

    expect = expect || [];
    if (typeof user === 'string') {
      user = this.template.users[user];
    }

    if (user === undefined) {
      user = this.owner;
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + submission.form + '/submission/' + submission._id;

    let currentRequest = request(app).put(url).send(submission);
    if (user) {
      currentRequest = currentRequest.set('x-jwt-token', user.token);
    }
    if (expect.length) {
      currentRequest = currentRequest.expect('Content-Type', expect[0]).expect(expect[1]);
    }
    else {
      currentRequest = currentRequest.expect('Content-Type', /json/).expect(200);
    }
    currentRequest.end((err, res) => {
      if (err) {
        return done(err);
      }

      this.lastResponse = res;
      if (expect.length && expect[1] > 299) {
        return done(null, res.body);
      }

      user.token = res.headers['x-jwt-token'];
      this.lastSubmission = res.body;
      _.each(this.template.submissions, (sub, form) => {
        if (sub._id === submission._id) {
          this.template.submissions[form] = res.body;
        }
      });
      done(null, res.body);
    });
  };

  Helper.prototype.patchSubmission = function(submission, update ,user, expect, done) {
    if (typeof user === 'function') {
      done = user;
      user = this.owner;
    }

    if (typeof expect === 'function') {
      done = expect;
      expect = [];
    }

    expect = expect || [];
    if (typeof user === 'string') {
      user = this.template.users[user];
    }

    if (user === undefined) {
      user = this.owner;
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += `/project/${this.template.project._id}`;
    }
    url += `/form/${submission.form}/submission/${submission._id}`;

    let currentRequest = request(app).patch(url).send(update);
    if (user) {
      currentRequest = currentRequest.set('x-jwt-token', user.token);
    }
    if (expect.length) {
      currentRequest = currentRequest.expect('Content-Type', expect[0]).expect(expect[1]);
    }
    else {
      currentRequest = currentRequest.expect('Content-Type', /json/).expect(200);
    }
    currentRequest.end((err, res) => {
      if (err) {
        return done(err);
      }
      this.lastResponse = res;
      if (expect.length && expect[1] > 299) {
        return done(null, res.body);
      }

      user.token = res.headers['x-jwt-token'];
      this.lastSubmission = res.body;
      _.each(this.template.submissions, (sub, form) => {
        if (sub._id === submission._id) {
          this.template.submissions[form] = res.body;
        }
      });
      done(null, res.body);
    });
  };

  Helper.prototype.createSubmission = function(form, data, user, expect, done) {
    // Two arguments.
    if (typeof form === 'object') {
      if (typeof data === 'function') {
        done = data;
      }
      data = form;
      form = this.contextName;
    }

    // Three arguments.
    if (typeof user === 'function') {
      done = user;
      user = this.owner;
    }

    // Four arguments
    if (typeof expect === 'function') {
      done = expect;
      expect = [];
    }

    expect = expect || [];
    if (typeof user === 'string') {
      user = this.template.users[user];
    }

    if (user === undefined) {
      user = this.owner;
    }

    if (!this.template.forms.hasOwnProperty(form)) {
      return done('Form not found');
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + this.template.forms[form]._id + '/submission';

    // Allow passing in the submission as well
    if (!data.hasOwnProperty('data')) {
      data = {data};
    }

    let currentRequest = request(app).post(url).send(data);
    if (user) {
      currentRequest = currentRequest.set('x-jwt-token', user.token);
    }
    if (expect.length) {
      currentRequest = currentRequest.expect('Content-Type', expect[0]).expect(expect[1]);
    }
    else {
      if (this.expects.length) {
        _.each(this.expects, (expect) => {
          currentRequest = currentRequest.expect(...expect);
        });
      }
      else {
        currentRequest = currentRequest.expect('Content-Type', /json/).expect(201);
      }
    }
    currentRequest.end((err, res) => {
      this.nextExpect = false;
      if (err) {
        return done(err);
      }

      this.lastResponse = res;
      if (expect.length && expect[1] > 299) {
        return done(null, res.body);
      }

      if (user && res.headers['x-jwt-token']) {
        user.token = res.headers['x-jwt-token'];
      }
      this.template.submissions = this.template.submissions || {};
      if (!this.template.submissions[form]) {
        this.template.submissions[form] = [];
      }

      this.lastSubmission = res.body;
      this.template.submissions[form].push(res.body);
      done(null, res.body);
    });
  };

  /**
   * Get a submission either by ID or by Index.
   *
   * @param form
   * @param id - (string) for Submission ID, (number) for Index.
   * @param user
   * @param done
   * @return {*}
   */
  Helper.prototype.getSubmission = function(form, id, user, expect, done) {
    if (typeof form === 'object') {
      if (typeof id === 'function') {
        done = id;
      }
      id = form;
      form = this.contextName;
    }

    if (typeof user === 'function') {
      done = user;
      user = this.owner;
    }

    if (typeof expect === 'function') {
      done = expect;
      expect = [];
    }

    expect = expect || [];
    if (typeof user === 'string') {
      user = this.template.users[user];
    }

    if (user === undefined) {
      user = this.owner;
    }

    if (!this.template.forms.hasOwnProperty(form)) {
      return done('Form not found');
    }

    var url = '';
    var subIndex = true;
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + this.template.forms[form]._id + '/submission';
    if (typeof id === 'string') {
      subIndex = false;
      url += '/' + id;
    }

    let currentRequest = request(app).get(url).send();
    if (user) {
      currentRequest = currentRequest.set('x-jwt-token', user.token);
    }
    if (expect.length) {
      currentRequest = currentRequest.expect('Content-Type', expect[0]).expect(expect[1]);
    }
    else {
      currentRequest = currentRequest.expect('Content-Type', /json/).expect(200);
    }
    currentRequest.end((err, res) => {
      if (err) {
        return done(err);
      }

      this.lastResponse = res;
      if (expect.length && expect[1] > 299) {
        return done();
      }

      if (user && res.headers['x-jwt-token']) {
        user.token = res.headers['x-jwt-token'];
      }
      this.template.submissions = this.template.submissions || {};
      if (subIndex) {
        this.template.submissions[form] = res.body;
      }
      else if (!this.template.submissions[form]) {
        this.template.submissions[form] = [];
      }

      const submission = subIndex ? res.body[id] : res.body;
      this.lastSubmission = submission;
      if (!subIndex) {
        const index = _.findIndex(this.template.submissions[form], {_id: submission._id});
        if (index === -1) {
          this.template.submissions[form].push(submission);
        }
        else {
          this.template.submissions[form][index] = submission;
        }
      }
      done(null, submission);
    });
  };

  Helper.prototype.deleteSubmission = function(submission, user, expect, done) {
    if (typeof user === 'function') {
      done = user;
      user = this.owner;
    }

    if (typeof expect === 'function') {
      done = expect;
      expect = [];
    }

    expect = expect || [];
    if (typeof user === 'string') {
      user = this.template.users[user];
    }

    if (user === undefined) {
      user = this.owner;
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + submission.form + '/submission/' + submission._id;

    let currentRequest = request(app).delete(url).send(submission);
    if (user) {
      currentRequest = currentRequest.set('x-jwt-token', user.token);
    }
    if (expect.length) {
      currentRequest = currentRequest.expect('Content-Type', expect[0]).expect(expect[1]);
    }
    else {
      currentRequest = currentRequest.expect('Content-Type', /json/).expect(200);
    }
    currentRequest.end((err, res) => {
        if (err) {
          return done(err);
        }

        this.lastResponse = res;
        if (expect.length && expect[1] > 299) {
          return done();
        }

        if (user && res.headers['x-jwt-token']) {
          user.token = res.headers['x-jwt-token'];
        }
        _.remove(this.template.submissions, {_id: submission._id});
        done();
      });
  };

  /**
   * Internal helper to create or edit a role
   *
   * @param role
   * @param done
   */
  Helper.prototype.upsertRole = function(role, update, done) {
    if (typeof update === 'function') {
      done = update;
      update = undefined;
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/role';

    if (update) {
      var _role;
      if (!role._id) {
        _role = this.getRole(role.title || role);
      }

      url += '/' + _role._id;
      request(app)
        .put(url)
        .send(update)
        .set('x-jwt-token', this.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err, res);
          }

          var response = res.body;
          this.lastResponse = res;
          this.owner.token = res.headers['x-jwt-token'];
          this.template.roles = this.template.roles || {};
          this.template.roles[response.title] = response;
          done(null, response);
        });
    }
    else {
      request(app)
        .post(url)
        .send(role)
        .set('x-jwt-token', this.owner.token)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          var response = res.body;
          this.lastResponse = res;
          this.owner.token = res.headers['x-jwt-token'];
          this.template.roles = this.template.roles || {};
          this.template.roles[response.title] = response;
          done(null, response);
        });
    }
  };

  /**
   * Delete a role.
   *
   * @param role
   * @param done
   */
  Helper.prototype.deleteRole = function(role, done) {
    var _role;
    if (!role._id) {
      _role = this.getRole(role.title || role);
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/role/' + _role._id;

    request(app)
      .delete(url)
      .set('x-jwt-token', this.owner.token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        var response = res.body;
        this.lastResponse = res;
        this.owner.token = res.headers['x-jwt-token'];
        this.template.roles = this.template.roles || {};
        delete this.template.roles[response.title];
        done(null, response);
      });
  };

  Helper.prototype.submission = function(form, data, user, expects) {
    if (data && data._id && data.form) {
      this.series.push(async.apply(this.updateSubmission.bind(this), data, user, expects));
    }
    else {
      this.series.push(async.apply(this.createSubmission.bind(this), form, data, user, expects));
    }
    return this;
  };

  Helper.prototype.expect = function(...args) {
    this.expects.push(args);
    return this;
  };

  Helper.prototype.user = function(form, user, data) {
    data = data || {};
    data.email = chance.email();
    data.password = chance.word();
    this.series.push((done) => {
      this.createSubmission(form, {data}, (err, submission) => {
        if (err) {
          return done(err);
        }

        assert(submission, 'Must have a user object');
        assert(submission._id, 'Must have created a new user');
        this.template.users[user] = submission;
        this.template.users[user].data.password = data.password;

        // Now authenticate as this user to get JWT token.
        this.createSubmission(form + 'Login', {data: {
          email: this.template.users[user].data.email,
          password: this.template.users[user].data.password
        }}, null, [/application\/json/, 200], (err) => {
          if (err) {
            return done(err);
          }

          const res = this.lastResponse.res;
          assert(res.headers['x-jwt-token'], 'Authentication must return x-jwt-token');
          this.template.users[user].token = res.headers['x-jwt-token'];
          done(null, this.template.users[user]);
        });
      });
    });
    return this;
  };

  Helper.prototype.execute = function(done) {
    return async.series(this.series, (err, res) => {
      this.series = [];
      this.expects = [];
      if (err) {
        return done(err, res);
      }
      done(null, this);
    });
  };

  Helper.prototype.getSubmissions = function(form, user, expect, done) {
    if (typeof form === 'object') {
      form = this.contextName;
    }

    if (typeof user === 'function') {
      done = user;
      user = this.owner;
    }

    if (typeof expect === 'function') {
      done = expect;
      expect = [];
    }

    expect = expect || [];
    if (typeof user === 'string') {
      user = this.template.users[user];
    }

    if (user === undefined) {
      user = this.owner;
    }

    if (!this.template.forms.hasOwnProperty(form)) {
      return done('Form not found');
    }

    let url = '';
    if (this.template.project && this.template.project._id) {
      url += `/project/${  this.template.project._id}`;
    }
    url += `/form/${  this.template.forms[form]._id  }/submission?limit=10&skip=0`;

    let currentRequest = request(app).get(url).send();
    if (user) {
      currentRequest = currentRequest.set('x-jwt-token', user.token);
    }
    if (expect.length) {
      currentRequest = currentRequest.expect('Content-Type', expect[0]).expect(expect[1]);
    }
    else {
      currentRequest = currentRequest.expect('Content-Type', /json/).expect(200);
    }
    currentRequest.end((err, res) => {
      if (err) {
        return done(err);
      }

      this.lastResponse = res;
      if (expect.length && expect[1] > 299) {
        return done();
      }

      if (user && res.headers['x-jwt-token']) {
        user.token = res.headers['x-jwt-token'];
      }
      this.template.submissions = this.template.submissions || {};
      if (this.template.submissions[form]) {
        this.template.submissions[form] = res.body;
      }
      else {
        this.template.submissions[form] = [];
      }

      done(null, res.body);
    });
  };

  Helper.assert = {
    propertiesEqual: (source, compare) => {
      _.each(source, (value, key) => {
        if (compare.hasOwnProperty(key)) {
          assert.deepEqual(value, compare[key]);
        }
      });
    }
  };

  return Helper;
};
