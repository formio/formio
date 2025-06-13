'use strict';

let invalid = /(^|\/)(form)($|\/)/;

/**
 * Update 2.3.2
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function (db, config, tools) {
  let forms = db.collection('forms');
  let projPaths = {};

  let makeUnique = function (form) {
    return new Promise((resolve, reject) => {
      let iter = 2;
      let comparison = form.path.toString() + iter.toString();
      while (form.path.match(invalid) || projPaths[form.project.toString()].indexOf(comparison) !== -1) {
        comparison = form.path.toString() + (++iter).toString();
      }

      forms
        .updateOne({ _id: form._id }, { $set: { path: comparison.toLowerCase() } })
        .then(() => {
          projPaths[form.project.toString()].push(comparison);
          resolve();
        })
        .catch(err => reject(err));
    });
  };

  let verifyUniquePaths = function () {
    projPaths = {};
    return forms
      .find({})
      .toArray()
      .then(docs => {
        return docs.reduce((promise, form) => {
          return promise.then(() => {
            projPaths[form.project.toString()] = projPaths[form.project.toString()] || [];

            if (form.path.match(invalid) || projPaths[form.project.toString()].indexOf(form.path) !== -1) {
              return makeUnique(form);
            } else {
              projPaths[form.project.toString()].push(form.path);
              return Promise.resolve();
            }
          });
        }, Promise.resolve());
      });
  };

  forms
    .find({ $or: [{ path: { $eq: '' } }, { path: { $eq: null } }, { path: { $regex: /(^|\/)(form)($|\/)/ } }] })
    .toArray()
    .then(docs => {
      return docs.reduce((promise, form) => {
        return promise.then(() => {
          return forms.updateOne({ _id: form._id }, { $set: { path: form.name.toLowerCase() } });
        });
      }, Promise.resolve());
    })
    .then(() => verifyUniquePaths())
    .catch(err => {
      console.error('Error occurred during the update:', err);
    });
};
