import _ from 'lodash';
import whilst from 'async/whilst';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/**
 * Convert all save as reference to ObjectId's.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let forms = db.collection('forms').find({deleted:null});
  let submissions = db.collection('submissions');
  forms.forEach((form) => {
    console.log(`Looking for references in ${form.title}`);
    tools.util.eachComponent(form.components, function(component, path) {
      if (component.reference) {
        submissions.find({form: form._id, deleted: null}).forEach((err, submission) => {
          if (err) {
            console.log('ERROR', err)
            return;
          }

          console.log(`Updating ${submission._id} within ${form.title}`);
          submissions.update({_id: submission._id}, {$set: {path: ObjectId(_.get(submission, path))}});
        });
      }
    });
  });
  done();
};
