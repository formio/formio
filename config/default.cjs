const defaultBase = 'mongodb://localhost:27017';

const mongoBase = process.env.MONGO
  ? process.env.MONGO.replace(/\/[^/]*$/, '')
  : defaultBase;

module.exports = {
  port: 3001,
  appPort: 8080,
  host: 'localhost:3001',
  protocol: 'http',
  allowedOrigins: ['*'],
  domain: 'http://localhost:3001',
  basePath: '',
  mongo: process.env.TEST_SUITE
    ? `${mongoBase}/formio-ce-test`
    : `${mongoBase}/formio-ce`,
  mongoConfig: '',
  mongoCA: '',
  mongoSecret: '--- change me now ---',
  reservedForms: [
    'submissions',
    'submission',
    'exists',
    'export',
    'role',
    'current',
    'logout',
    'import',
    'form',
    'access',
    'token',
    'recaptcha',
    'captcha',
  ],
  jwt: {
    secret: '--- change me now ---',
    expireTime: 240,
  },
  email: {
    type: 'sendgrid',
    username: 'sendgrid-user',
    password: 'sendgrid-pass',
  },
  settings: {
    office365: {
      tenant: '',
      clientId: '',
      email: '',
      cert: '',
      thumbprint: '',
    },
    email: {
      gmail: {
        auth: {
          user: '',
          pass: '',
        },
      },
      sendgrid: {
        auth: {
          api_user: '',
          api_key: '',
        },
      },
    },
  },
};
