'use strict';

/**
 * Update 2.2.1
 *
 * Lowercases all Form paths.
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function(db, config, tools) {
  let forms = db.collection('forms');

  forms.find().toArray().forEach(function(form) {
    if(form.path) {
      forms.updateOne(
        { _id: form._id },
        { $set: { path: form.path.toLowerCase() } }
      );
    }
  });
};
