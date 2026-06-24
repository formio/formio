const debug = require('debug')('formio:db');

/**
 * Update 3.1.20
 *
 * Add composite indexes to action collection 
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = async function(db, config, tools, done) {
  done();

  let actionsCollection = db.collection('actions');
  actionsCollection.createIndex(
    {'priority': 1, 'title': 1},
    {name: 'priority_1_title_1'},
    {background: true});
};
