'use strict';

let vm = require('vm');
let WebWorker = require('webworker-threads').Worker;

class Worker extends WebWorker {
  constructor(task, context, timeout, callback) {
    super(() => {
      try {
        let vmCode = vm.script(task);
        let vmContext = vm.createContext(context);
        vmCode.runInContext(vmContext, { timeout });

        callback(null, context);
        return close();
      }
      catch (e) {
        console.log(e.message);
        console.log(e.stack);
        throw e;
      }

      this.onerror(callback);
    });
  }
};

module.exports = Worker;
