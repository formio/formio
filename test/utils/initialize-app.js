'use strict';

const { cloneDeep } = require('lodash');
const request = require('supertest');
const EventEmitter = require('events');
const { register: registerListener } = require('./reuse-listener');

let appInstance = null;

const registerUser = async (app, hook, template, formId, userData) => {
  const res = await request(app)
    .post(hook.alter('url', '/form/' + formId + '/submission', template))
    .send({ data: { email: userData.email, password: userData.password } });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error('Failed to register user: ' + res.status + ' ' + res.text);
  }

  return {
    ...res.body,
    data: { email: res.body.data.email, password: userData.password },
    token: res.headers['x-jwt-token'],
  };
};

const registerAdmin = (app, hook, template) =>
  registerUser(app, hook, template, template.forms.adminRegister._id, template.users.admin.data);

const registerAdmin2 = (app, hook, template) =>
  registerUser(app, hook, template, template.forms.adminRegister._id, template.users.admin2.data);

const registerUser1 = (app, hook, template) =>
  registerUser(app, hook, template, template.forms.userRegister._id, template.users.user1.data);

const registerUser2 = (app, hook, template) =>
  registerUser(app, hook, template, template.forms.userRegister._id, template.users.user2.data);

const clearData = (app) =>
  new Promise((resolve, reject) => {
    const async = require('async');
    const dropDocuments = async (model, next) => {
      await model.deleteMany({});
      return next();
    };
    async.series(
      [
        async.apply(dropDocuments, app.formio.resources.form.model),
        async.apply(dropDocuments, app.formio.resources.submission.model),
        async.apply(dropDocuments, app.formio.actions.model),
        async.apply(dropDocuments, app.formio.resources.role.model),
      ],
      (err) => (err ? reject(err) : resolve()),
    );
  });

const importTemplate = (app, template) =>
  new Promise((resolve, reject) => {
    app.formio.template.import.template(template, (err) => (err ? reject(err) : resolve()));
  });

const cloneTemplate = (template) => {
  const clone = cloneDeep(template);
  clone.Helper = template.Helper;
  clone.hooks = template.hooks;
  clone.config = template.config;
  clone.clearData = template.clearData;
  return clone;
};

const setupApp = async () => {
  const hooks = require('../hooks');
  const state = await require('../../server')({ hooks });
  const app = state.server;
  const hook = require('../../src/util/hook')(app.formio);
  // Registered, not just started: test/utils/reuse-listener.js points every
  // `request(app)` at this server instead of letting supertest bind a throwaway one per
  // request. The port must stay config.port, which isolate-process.js has already made
  // unique per process.
  registerListener(app, app.listen(state.config.port));
  return { app, hook, config: state.config };
};

const resetData = async (app, hook, config, skipUserRegistration = false) => {
  const template = require('../fixtures/template')();

  template.Helper = require('../helper')(app);
  template.hooks = app.formio.hooks || {};
  if (template.hooks.addEmitter) {
    template.hooks.addEmitter(new EventEmitter());
  }
  template.config = config;
  template.clearData = (cb) =>
    clearData(app)
      .then(() => cb())
      .catch(cb);

  await clearData(app);
  await importTemplate(app, template);

  if (!skipUserRegistration) {
    template.users.admin = await registerAdmin(app, hook, template);
    template.users.admin2 = await registerAdmin2(app, hook, template);

    const [user1, user2] = await Promise.all([
      registerUser1(app, hook, template),
      registerUser2(app, hook, template),
    ]);
    template.users.user1 = user1;
    template.users.user2 = user2;
  }

  return template;
};

async function initializeApp(options = {}) {
  const { skipUserRegistration = false } = options;
  if (!appInstance) {
    const { app, hook, config } = await setupApp();
    appInstance = { app, hook, config };
  }

  const { app, hook, config } = appInstance;
  const template = await resetData(app, hook, config, skipUserRegistration);

  return { app, template: cloneTemplate(template), hook };
}

module.exports = initializeApp;

// Drops the database isolate-process.js gave this process. A no-op when no spec ever
// booted the app, so a run of pure unit wrappers leaves nothing behind either.
module.exports.dropDatabase = async function dropDatabase() {
  if (!appInstance) {
    return;
  }

  const { mongoose } = appInstance.app.formio;
  const uri = appInstance.config.mongo;

  // Disconnect BEFORE dropping. Dropping on the live connection leaves mongoose free to
  // recreate the database behind us -- a background index build is enough -- and the run
  // then leaks a database holding just `forms`/`actions`/`roles`, which
  // test/tools/sweep-dbs.js has to clean up later. Drop from a throwaway connection
  // instead, once nothing is left to write.
  await mongoose.disconnect();

  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
};
