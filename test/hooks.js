'use strict';

let _ = require('lodash');
let emails = [];
let events = null;
let Emailer = {
  addEmitter: (eventEmitter) => {
    this.events = eventEmitter;
  },
  getEmitter: () => this.events,
  reset: () => {
    emails = [];
  },
  getLastEmail: () => {
    let email = _.cloneDeep(emails.pop()) || {};
    Emailer.reset();
    return email;
  },
  getEmails: () => {
    let _emails = _.cloneDeep(emails) || [];
    Emailer.reset();
    return _emails;
  },
  on: {},
  alter: {
    emailSend: (send, mail, cb) => {
      // Only cache 10 emails.
      if (emails.length > 9) {
        emails.shift();
      }
      emails.push(mail);

      // If events are enabled
      if (this.events) {
        this.events.emit('newMail', mail);
      }
      else {
        console.error(`No event emitter is available`);
      }

      return cb(null, false);
    }
  }
};

module.exports = Emailer;
