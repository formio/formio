'use strict';
let async = require('async');
module.exports = function(db, config, tools, done) {
  let dropIndex = function(collection, index, next) {
    console.log('Dropping ' + collection + ' index ' + index);
    db.collection(collection).dropIndex(index).then(() => {
      console.log('Done dropping ' + collection + ' index ' + index);
      next();
    }).catch((err) => {
      console.log(err.message);
      next();
    });
  };

  async.series([
    async.apply(dropIndex, 'roles', 'machineName_1'),
    async.apply(dropIndex, 'forms', 'machineName_1'),
    async.apply(dropIndex, 'submissions', 'machineName_1'),
    async.apply(dropIndex, 'actions', 'machineName_1'),
  ], () => done());
};
