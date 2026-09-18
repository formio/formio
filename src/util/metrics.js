'use strict';

/**
 * The measurements this server reports through `hook.report('count' | 'observe', buildArgs)`.
 *
 * These names ship in the npm package and are what a consumer's dashboards key on, so they are
 * public API: keep the set tiny, and declare a name here rather than writing the literal at the
 * call site. A test asserts this file is the only place in `src/` they appear.
 *
 * The instrument kind behind each name — counter, histogram, gauge, bucket boundaries, units — is
 * the implementation's decision, not this package's.
 */
module.exports = {
  // How many field and property handlers one validation pass fanned out to.
  SUBMISSION_FIELD_HANDLERS: 'formio.submission.field_handlers',

  // How many components the form of the current request carries, flattened.
  FORM_COMPONENTS: 'formio.form.components',

  // Submissions persisted.
  SUBMISSION_CREATED: 'formio.submission.created',
};
