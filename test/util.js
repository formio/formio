const { FEATURE_FLAGS, isFeatureEnabled } = require('@formio/feature-flags');

const IS_NEXTGEN = isFeatureEnabled(FEATURE_FLAGS.NEXTGEN_VALIDATOR, (flag) => {
  const value = process.env[flag.envVar];
  if (value === undefined || value === '') {
    return null;
  }
  return value === '1' || value === 'true';
});

const toNumber = (value) => Number(String(value).replace(/,/g, ''));

const normalizeNextgenData = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeNextgenData);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        if (/^currency/.test(key)) {
          return [key, Array.isArray(val) ? val.map(toNumber) : toNumber(val)];
        }
        return [key, normalizeNextgenData(val)];
      }),
    );
  }
  return value;
};

module.exports = {
  wait: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  IS_NEXTGEN,
  nextgenExpectData: (submission) => (IS_NEXTGEN ? normalizeNextgenData(submission) : submission),
};
