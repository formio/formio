'use strict';

let vm = require('vm');
let WebWorker = require('webworker-threads').Worker;

let Worker = (task, context, timeout, callback) => {
  let worker = new WebWorker(() => {
    try {
      let vmCode = vm.script(task);
      let vmContext = vm.createContext(context);
      vmCode.runInContext(vmContext, {
        timeout: timeout
      });

      callback(null, context);
      return close();
    }
    catch (e) {
      throw e;
    }
  });
  worker.onerror(callback);

  return worker;
};

module.exports = Worker;
