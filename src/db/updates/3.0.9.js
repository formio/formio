'use strict';
module.exports = async function(db, config, tools) {
  let dropIndex = function(collection, index, next) {
    console.log('Dropping ' + collection + ' index ' + index);
    db.collection(collection).dropIndex(index).then(() => {
      console.log('Done dropping ' + collection + ' index ' + index);
    }).catch((err) => {
      console.log(err.message);
    });
  };

    await dropIndex('roles', 'machineName_1');
    await dropIndex('forms', 'machineName_1');
    await dropIndex('submissions', 'machineName_1');
    await dropIndex('actions', 'machineName_1');
};
