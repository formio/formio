'use strict';

/**
 * Update 2.2.1
 *
 * Lowercases all Form paths.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let forms = db.collection('forms');

  forms.find().snapshot({$snapshot: true}).forEach(function(form) {
    if(form.path) {
      forms.updateOne(
        { _id: form._id },
        { $set: { path: form.path.toLowerCase() } }
      );
    }
  }, done);
};
