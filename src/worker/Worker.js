'use strict';

const Thread = require('formio-workers/Thread');

module.exports = (formio) => {
  const hook = require('../util/hook')(formio);

  class Worker {
    constructor(type) {
      this.worker = hook.alter('worker', type);
      if (!this.worker || (this.worker === type)) {
        this.worker = new Thread(type);
      }
    }

    start(data) {
      return this.worker.start(data);
    }
  }

  return Worker;
};
