'use strict';

const querystring = require('querystring');
const fetch = require('@formio/node-fetch-http-proxy');

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);

  router.get('/recaptcha', async function(req, res) {
    try {
      const settings = await hook.settings(req);
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

      const response = await fetch(`${url}?${query}`, {method: 'POST'});
      const body = response.ok ? await res.json() : null;
      if (!body) {
        throw new Error('No response from Google');
      }

      if (!body.success) {
        return res.send(body);
      }

      const expirationTime = 600000; // 10 minutes

      // Create temp token with recaptcha response token as value
      // to verify it on validation step
      try {
        await router.formio.mongoose.models.token.create({
          value: req.query.recaptchaToken,
          expireAt: Date.now() + expirationTime,
        });
        res.send(body);
      }
 catch (err) {
        return res.status(400).send(err.message);
      }
    }
    catch (err) {
      return res.status(400).send('reCAPTCHA settings not set.');
    }
  });
};
