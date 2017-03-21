'use strict';

module.exports = function(db, config, tools, done) {
  let roles = db.collection('roles');
  let forms = db.collection('forms');
  let submissions = db.collection('submissions');

  /**
   * Create a promise for role creation index.
   *
   * @type {Promise}
   */
  let roleCreatedIndex = new Promise((resolve, reject) => {
    roles.createIndex({created: 1}, {background: true}, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });

  /**
   * Create a promise for role modification index.
   *
   * @type {Promise}
   */
  let roleModifiedIndex = new Promise((resolve, reject) => {
    roles.createIndex({modified: 1}, {background: true}, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });

  /**
   * Create a promise for form creation index.
   *
   * @type {Promise}
   */
  let formCreatedIndex = new Promise((resolve, reject) => {
    forms.createIndex({created: 1}, {background: true}, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });

  /**
   * Create a promise for form modification index.
   *
   * @type {Promise}
   */
  let formModifiedIndex = new Promise((resolve, reject) => {
    forms.createIndex({modified: 1}, {background: true}, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });

  /**
   * Create a promise for submission creation index.
   *
   * @type {Promise}
   */
  let submissionCreatedIndex = new Promise((resolve, reject) => {
    submissions.createIndex({created: 1}, {background: true}, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });

  /**
   * Create a promise for submission modification index.
   *
   * @type {Promise}
   */
  let submissionModifiedIndex = new Promise((resolve, reject) => {
    submissions.createIndex({modified: 1}, {background: true}, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
  
  Promise.all([
    roleCreatedIndex,
    roleModifiedIndex,
    formCreatedIndex,
    formModifiedIndex,
    submissionCreatedIndex,
    submissionModifiedIndex
  ])
  .then(() => {
    return done();
  })
  .catch(done);
};
