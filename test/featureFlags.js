/* eslint-env mocha */
'use strict';
const assert = require('assert');
const util = require('../src/util/util');
// FOR REFERENCE ONLY
// I had to make this test work with the new feature flags package. I had to mock the config module to simulate the restart of the server.

module.exports = (app, template) => {
  describe('Feature Flags', () => {
    describe('Feature Flags with Environment Variables', () => {
      let originalEnv;
      let config;

      const reloadConfig = () => {
        // Clear the config module from cache
        delete require.cache[require.resolve('../config/default.cjs')];

        Object.keys(require.cache).forEach((key) => {
          if (key.includes('@formio/feature-flags')) {
            delete require.cache[key];
          }
        });

        // Reload the config module
        config = util.getServerConfig();
      };

      beforeEach(() => {
        // Save original environment
        originalEnv = {...process.env};
      });

      afterEach(() => {
        process.env = originalEnv;
        reloadConfig();
      });

      it('should use default value when env var is not set', () => {
        delete process.env.FORMIO_FEATURE_EXAMPLE;
        reloadConfig();

        assert.strictEqual(config.featureFlags.EXAMPLE, false);
      });

      it('should return true when env var is "true"', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = 'true';
        reloadConfig();

        assert.strictEqual(config.featureFlags.EXAMPLE, true);
      });

      it('should return true when env var is "1"', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '1';
        reloadConfig();

        assert.strictEqual(config.featureFlags.EXAMPLE, true);
      });

      it('should return false when env var is "false"', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = 'false';
        reloadConfig();

        assert.strictEqual(config.featureFlags.EXAMPLE, false);
      });

      it('should return false when env var is "0"', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '0';
        reloadConfig();

        assert.strictEqual(config.featureFlags.EXAMPLE, false);
      });

      it('should return default (false) when env var is "11"', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '11';
        reloadConfig();

        // "11" doesn't match "true" or "1", so it returns false
        assert.strictEqual(config.featureFlags.EXAMPLE, false);
      });

      it('should return false when env var is an invalid string', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = 'invalid-value';
        reloadConfig();

        assert.strictEqual(config.featureFlags.EXAMPLE, false);
      });
    });

    describe('isFeatureEnabled', () => {
      let originalEnv;
      let config;

      const reloadConfig = () => {
        delete require.cache[require.resolve('../config/default.cjs')];

        Object.keys(require.cache).forEach((key) => {
          if (key.includes('@formio/feature-flags')) {
            delete require.cache[key];
          }
        });

        config = util.getServerConfig();
      };

      beforeEach(() => {
        originalEnv = {...process.env};
      });

      afterEach(() => {
        process.env = originalEnv;
        reloadConfig();
      });

      it('should check if feature is enabled with "true" env var', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = 'true';
        reloadConfig();

        const isEnabled = config.isFeatureEnabled(config.FEATURE_FLAGS.EXAMPLE);

        assert.strictEqual(isEnabled, true);
      });

      it('should check if feature is enabled with "1" env var', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '1';
        reloadConfig();
        const isEnabled = config.isFeatureEnabled(config.FEATURE_FLAGS.EXAMPLE);

        assert.strictEqual(isEnabled, true);
      });

      it('should check if feature is enabled with "0" env var', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '0';
        reloadConfig();

        const isEnabled = config.isFeatureEnabled(config.FEATURE_FLAGS.EXAMPLE);

        assert.strictEqual(isEnabled, false);
      });

      it('should check if feature is disabled with "false" env var', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = 'false';
        reloadConfig();

        const isEnabled = config.isFeatureEnabled(config.FEATURE_FLAGS.EXAMPLE);

        assert.strictEqual(isEnabled, false);
      });

      it('should use default value when env var is invalid', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '11';
        reloadConfig();

        const isEnabled = config.isFeatureEnabled(config.FEATURE_FLAGS.EXAMPLE);

        assert.strictEqual(isEnabled, false);
      });

      it('should use default value when env var is invalid and default value is true should be true', () => {
        process.env.FORMIO_FEATURE_EXAMPLE = '11';
        reloadConfig();

        const testFlag = {key: 'MY_NEW_FEATURE', envVar: 'FORMIO_FEATURE_MY_NEW_FEATURE', defaultValue: true};
        const isEnabled = config.isFeatureEnabled(testFlag);

        assert.strictEqual(isEnabled, true);
      });
    });
  });
};
