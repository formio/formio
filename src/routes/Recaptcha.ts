import * as request from 'request-promise-native';

import { Route } from '@formio/api';

export class Recaptcha extends Route {
  get path() {
    return `${super.path}/recaptcha`;
  }

  public async execute(req, res) {
    const settings = (this.app.config && this.app.config.settings) || {};

    if (!settings.recaptcha || !settings.recaptcha.secretKey) {
      return res.status(400).send('reCAPTCHA settings not set.');
    }

    if (!req.query.recaptchaToken) {
      return res.status(400).send('reCAPTCHA token is not specified');
    }

    const requestOptions = {
      method: 'POST',
      json: true,
      uri: 'https://www.google.com/recaptcha/api/siteverify',
      form: {
        secret: settings.recaptcha.secretKey,
        response: req.query.recaptchaToken,
      },
    };

    const body = await request(requestOptions);

    if (!body) {
      throw new Error('No response from Google');
    }

    return res.send(body);
  }
}
