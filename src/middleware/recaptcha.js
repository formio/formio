'use strict';

const util = require('../util/util');
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  router.get('/recaptcha',
      function(req, res) {
        hook.settings(req, (err, settings) => {
          if (!settings.recaptcha || !settings.recaptcha.secretKey) {
            return res.status(400).send('reCAPTCHA settings not set.');
          }
          if (!req.query.recaptchaToken) {
            return res.status(400).send('reCAPTCHA token is not specified');
          }
          util.request({
            method: 'POST',
            json: true,
            url: 'https://www.google.com/recaptcha/api/siteverify',
            form: {
              secret: settings.recaptcha.secretKey,
              response: req.query.recaptchaToken
            }
          }).spread((response, body) => {
            if (!body) {
              throw 'No response from Google';
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
      }
  );
};
