'use strict';

let path = require('path');
let Threads = require('threads');
let config = Threads.config;
let Spawn = Threads.spawn;

config.set({
  basepath: {
    node: path.join(__dirname, 'tasks')
  }
});

class Thread {
  constructor(task) {
    this._thread = new Spawn(task);
  }

  start(data) {
    return new Promise((resolve, reject) => {
      this._thread.send(data)
      .on('message', message => {
        this._thread.kill();
        return resolve(message);
      })
      .on('error', error => {
        this._thread.kill();
        return reject(error);
      });
    });
  }
}

Thread.Tasks = {
  nunjucks: 'nunjucks.js'
};

module.exports = Thread;
