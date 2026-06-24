const debug = require('debug')('formio:db');

/**
 * Update 3.1.5
 *
 * Add a case insensitive index to the data.email field in the submissions collection
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = async function(db, config, tools, done) {
  done();

  // If collation is not allowed, then skip this update.
  if (!config.mongoFeatures?.collation) {
    return;
  }

  let submissionsCollection = db.collection('submissions');
  // Check if an index already exists on the submissions collection for the data.email field
  let indexExists = await submissionsCollection.indexExists('form_1_project_1_data.email_1_deleted_1');

  if (indexExists) {
    debug('`data.email` index exists exists, dropping');
    await submissionsCollection.dropIndex('form_1_project_1_data.email_1_deleted_1');
  }

  try {
    // Create a case-sensitive index on the submissions collection for the data.email field
    await submissionsCollection.createIndex(
      { form: 1, project: 1, 'data.email': 1, deleted: 1 },
      { background: true, collation: { locale: 'en', strength: 2 } }
    );
  }
  catch (err) {
    // We assume that an error means MongoDB API incompatibility (i.e. MongoDB < 3.4.0 or DocumentDB) so we'll create the index as normal
    debug('Case insensitive index creation failed, falling back to non-collated index creation');
    try {
      await submissionsCollection.createIndex({ form: 1, project: 1, 'data.email': 1, deleted: 1 }, { background: true });
    }
    catch (err) {
      debug(err);
      debug('Index creation failed with error above, skipping');
    }
  }
};
