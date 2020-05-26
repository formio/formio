'use strict';

const querystring = require('querystring');
const fetch = require('../util/fetch');

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);

  router.get('/recaptcha', function(req, res) {
    hook.settings(req, (err, settings) => {
      if (!settings.recaptcha || !settings.recaptcha.secretKey) {
        return res.status(400).send('reCAPTCHA settings not set.');
      }
      if (!req.query.recaptchaToken) {
        return res.status(400).send('reCAPTCHA token is not specified');
      }

      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const query = querystring.stringify({
        secret: settings.recaptcha.secretKey,
        response: req.query.recaptchaToken,
      });

      fetch(`${url}?${query}`, {method: 'POST'})
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (!body) {
            throw new Error('No response from Google');
          }
          res.send(body);
        });
    });
  });
};
