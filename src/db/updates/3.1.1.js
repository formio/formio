'use strict';

/**
 * Update 3.1.1
 *
 * This update does the following.
 *
 *   1.) Convert all date values to BSON dates.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  const formCollection = db.collection('forms');
  const submissionCollection = db.collection('submissions');

  const getDateForms = () => new Promise((resolve, reject) => {
    formCollection
      .find({deleted: {$eq: null}})
      .snapshot(true)
      .map(form => {
        const fields = [];
        tools.util.eachComponent(form.components, function(component, path) {
          // We only care about non-layout components, which are not unique, and have not been blacklisted.
          if (component.type === 'datetime') {
            fields.push(path);
          }
        }, true);

        if (fields.length) {
          return {
            _id: form._id,
            fields
          };
        }
        // Returning null will stop the .map function.
        return false;
      })
      .toArray((err, forms) => {
        if (err) {
          reject(err);
        }
        resolve(forms.filter(form => form));
      });
  });

  const setDateField = (field, data) => {
    const parts = field.split('.');
    let value = data[parts[0]];
    // Handle Datagrids
    if (Array.isArray(value)) {
      return value.reduce((changed, row) => {
        return setDateField(parts.slice(1).join('.'), row) || changed;
      }, false);
    }
    // Handle Containers
    if (parts.length > 1) {
      return setDateFields(parts.slice(1).join('.'), value) || changed;
    }
    if (value && !(value instanceof Date)) {
      data[parts[0]] = new Date(value);
      return true;
    }
    else {
      return false;
    }
  };

  const updateSubmissions = forms => {
    return Promise.all(forms.map(form => {
      return new Promise((resolve, reject) => {
        submissionCollection
          .find({
            form: tools.util.ObjectId(form._id),
            deleted: {$eq: null}
          })
          .snapshot(true)
          .toArray((err, result) => {
            if (err) {
              return reject(err);
            }
            if (!result.length) {
              return resolve();
            }
            resolve(Promise.all(result.map(submission => {
              return new Promise((resolve, reject) => {
                const changed = form.fields.reduce((changed, field) => {
                  return setDateField(field, submission.data) || changed;
                }, false);
                if (changed) {
                  console.log('Updating date fields for submission: ' + submission._id);
                  return resolve(submissionCollection.updateOne(
                    {
                      _id: tools.util.ObjectId(submission._id)
                    },
                    {
                      $set: {
                        data: submission.data
                      }
                    },
                    {
                      upsert: false
                    }
                  ));
                }
                else {
                  return resolve();
                }
              });
            })));
          });
      });
    }));
  };

  getDateForms().then(forms => {
    return updateSubmissions(forms).then(() => {done()});
  });
};
