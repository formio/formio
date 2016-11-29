'use strict';

var request = require('supertest');
var chance = new (require('chance'))();
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var docker = process.env.DOCKER;

module.exports = function(app) {
  // The Helper class.
  var Helper = function(owner) {
    this.contextName = '';
    this.lastSubmission = null;
    this.owner = owner;
    this.series = [];
    this.template = {
      project: null,
      forms: {},
      actions: {},
      submissions: {},
      roles: {}
    };
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
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        _.each(res.body, function(form) {
          this.template.forms[form.name] = form;
        }.bind(this));
        this.owner.token = res.headers['x-jwt-token'];
        done(null, this.template.forms);
      }.bind(this));
  };

  Helper.prototype.getForm = function(name) {
    if (this.template.forms.hasOwnProperty(name)) {
      return this.template.forms[name];
    }

    return null;
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
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        // Assign the roles.
        assert.equal(res.body.length, 3);
        _.each(res.body, function(role) {
          if (role.admin) {
            this.template.roles.administrator = role;
          }
          else if (role.default) {
            this.template.roles.anonymous = role;
          }
          else {
            this.template.roles.authenticated = role;
          }
        }.bind(this));
        assert.equal(Object.keys(this.template.roles).length, 3);
        this.owner.token = res.headers['x-jwt-token'];
        done(null, this.template.roles);
      }.bind(this));
  };

  Helper.prototype.getRolesAndForms = function(done) {
    async.series([
      async.apply(this.getForms.bind(this)),
      async.apply(this.getRoles.bind(this))
    ], function(err) {
      if (err) {
        return done(err);
      }
      done(null, this.template);
    }.bind(this));
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
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        this.template.project = res.body;
        return done(null, res.body);
      }.bind(this));
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
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          this.template.project = res.body;
          this.getRolesAndForms(function(err) {
            if (err) {
              return done(err);
            }
            return done(null, res.body);
          });
        }.bind(this));
    }
    else {
      this.getRolesAndForms(function(err) {
        if (err) {
          return done(err);
        }
        return done(null, this.template);
      }.bind(this));
    }
  };

  Helper.prototype.project = function(settings) {
    this.series.push(async.apply(this.createProject.bind(this), settings));
    return this;
  };

  Helper.prototype.upsertForm = function(name, type, components, access, done) {
    if (typeof access === 'function') {
      done = access;
      access = null;
    }

    this.contextName = name;

    // If no access is provided, then use the default.
    if (!access) {
      access = {
        submissionAccess: [],
        access: []
      };
    }

    // Convert the role names to role ids.
    ['access', 'submissionAccess'].forEach(function(accessName) {
      _.each(access[accessName], function(perm, i) {
        _.each(perm.roles, function(permRole, j) {
          if (this.template.roles.hasOwnProperty(permRole)) {
            access[accessName][i].roles[j] = this.template.roles[permRole]._id;
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));

    var method = 'post';
    var status = 201;
    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form';
    var data = {
      title: name,
      name: name,
      path: name,
      type: type,
      access: access.access,
      submissionAccess: access.submissionAccess,
      components: components
    };
    if (this.template.forms.hasOwnProperty(name)) {
      method = 'put';
      status = 200;
      url += '/' + this.template.forms[name]._id;
      data = {
        components: components
      }
    }
    request(app)[method](url)
      .send(data)
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .expect(status)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        this.owner.token = res.headers['x-jwt-token'];
        this.template.forms[name] = res.body;
        done(null, res.body);
      }.bind(this));
  };

  Helper.prototype.form = function(name, components, access) {
    if (typeof name === 'object') {
      components = name;
      name = chance.word();
    }
    this.series.push(async.apply(this.upsertForm.bind(this), name, 'form', components, access));
    return this;
  };

  Helper.prototype.resource = function(name, components, access) {
    if (typeof name === 'object') {
      components = name;
      name = chance.word();
    }
    this.series.push(async.apply(this.upsertForm.bind(this), name, 'resource', components, access));
    return this;
  };

  Helper.prototype.createAction = function(form, action, done) {
    if (typeof form === 'object') {
      action = form;
      form = this.contextName;
    }

    if (!this.template.forms.hasOwnProperty(form)) {
      return done('Form not found');
    }

    if (action.settings.resources) {
      var resources = [];
      _.each(action.settings.resources, function(resource) {
        if (this.template.forms.hasOwnProperty(resource)) {
          resources.push(this.template.forms[resource]._id);
        }
      }.bind(this));
      action.settings.resources = resources;
    }

    if (action.settings.role && this.template.roles.hasOwnProperty(action.settings.role)) {
      action.settings.role = this.template.roles[action.settings.role]._id;
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
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        this.owner.token = res.headers['x-jwt-token'];
        if (!this.template.actions[form]) {
          this.template.actions[form] = [];
        }
        this.template.actions[form].push(res.body);
        done(null, res.body);
      }.bind(this));
  };

  Helper.prototype.action = function(form, action) {
    this.series.push(async.apply(this.createAction.bind(this), form, action));
    return this;
  };

  Helper.prototype.createSubmission = function(form, data, done) {
    if (typeof form === 'object') {
      data = form;
      form = this.contextName;
    }

    if (!this.template.forms.hasOwnProperty(form)) {
      return done('Form not found');
    }

    var url = '';
    if (this.template.project && this.template.project._id) {
      url += '/project/' + this.template.project._id;
    }
    url += '/form/' + this.template.forms[form]._id + '/submission';

    request(app)
      .post(url)
      .send({
        data: data
      })
      .set('x-jwt-token', this.owner.token)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        this.owner.token = res.headers['x-jwt-token'];
        if (!this.template.submissions[form]) {
          this.template.submissions[form] = [];
        }

        this.lastSubmission = res.body;
        this.template.submissions[form].push(res.body);
        done(null, res.body);
      }.bind(this));
  };

  Helper.prototype.submission = function(form, data) {
    this.series.push(async.apply(this.createSubmission.bind(this), form, data));
    return this;
  };

  Helper.prototype.execute = function(done) {
    return async.series(this.series, function(err, res) {
      this.series = [];
      if (err) {
        return done(err, res);
      }
      done(null, this);
    }.bind(this));
  };

  return Helper;
};
