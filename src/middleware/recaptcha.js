'use strict';

const querystring = require('querystring');
const fetch = require('@formio/node-fetch-http-proxy');

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

          if (!body.success) {
            return res.send(body);
          }

          const expirationTime = 600000; // 10 minutes

          // Create temp token with recaptcha response token as value
          // to verify it on validation step
          router.formio.mongoose.models.token.create({
            value: req.query.recaptchaToken,
            expireAt: Date.now() + expirationTime,
          }, (err) => {
            if (err) {
              return res.status(400).send(err.message);
            }

            res.send(body);
          });
        });
    });
  });
};
