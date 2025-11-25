const featureFlags = require('@formio/feature-flags');

// Find the config in either an environment variable or docker secret.
const getConfig = (key, defaultValue) => {
  // If an environment variable is set.
  if (process.env.hasOwnProperty(key)) {
    return process.env[key];
  }
  return defaultValue;
};

// Export the FEATURE_FLAGS constant object for structured access
//router.config.FEATURE_FLAGS = featureFlags.FEATURE_FLAGS;
// Parse env var to boolean if it's a string
const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value.toLowerCase() === 'false' || value === '0') {
    return false;
  }
  return value.toLowerCase() === 'true' || value === '1';
};

// Get all feature flags with config overrides
// Using getConfig allows pulling from env vars, etc.
const featureConfig = (flag) => {
  return parseBoolean(getConfig(flag.envVar, flag.defaultValue));
};

module.exports = {
  port: 3001,
  appPort: 8080,
  host: 'localhost:3001',
  protocol: 'http',
  allowedOrigins: [
    '*',
  ],
  domain: 'http://localhost:3001',
  basePath: '',
  mongo: process.env.TEST_SUITE
    ? 'mongodb://localhost:27017/formio-ce-test'
    : 'mongodb://localhost:27017/formio-ce',
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
  FEATURE_FLAGS: featureFlags.FEATURE_FLAGS,
  featureConfig: featureConfig,
  featureFlags: featureFlags.getFeatureFlags(featureConfig),
  isFeatureEnabled : (flag) => {
      return featureFlags.isFeatureEnabled(flag, featureConfig);
    }
};
