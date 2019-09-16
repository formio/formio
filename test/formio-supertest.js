const supertest = require('supertest');
const use = require('superagent-use');
const captureError = require('supertest-capture-error');

const request = app => {
  const _request = use(supertest(app));

  _request.use(captureError((error, test) => {
    try {
      error.message += '\n\nResponse: ' + JSON.stringify(JSON.parse(test.res.text), null, 4)
    }
    catch {}

    error.stack = '';
  }));

  return _request;
};

module.exports = request;