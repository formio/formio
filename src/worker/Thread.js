'use strict';

let path = require('path');
let Threads = require('threads');
let config  = Threads.config;
let Spawn   = Threads.spawn;

config.set({
  basepath: {
    node: path.join(__dirname, './tasks')
  }
});

class Thread extends Spawn {
  constructor(task) {
    if (!Thread.Tasks.hasOwnProperty(task)) {
      throw new Error(`Unknown task given to Thread Worker: ${task}`);
    }

    // Create a new thread with our task.
    super(Thread.Tasks[task]);
  }

  start(data) {
    return new Promise((resolve, reject) => {
      this.send(data)
        .on('message', message => {
          this.stop();
          return resolve(message);
        })
        .on('error', error => {
          this.stop();
          return reject(error);
        });
    });
  }
}

Thread.prototype.Tasks = {
  nunjucks: 'nunjucks.js'
};

module.exports = Thread;
