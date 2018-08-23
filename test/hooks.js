'use strict';

const _ = require('lodash');
let emails = [];
const Emailer = {
  addEmitter(eventEmitter) {
    this.events = eventEmitter;
  },
  getEmitter() {
    return this.events;
  },
  reset() {
    emails = [];
  },
  getLastEmail() {
    const email = _.cloneDeep(emails.pop()) || {};
    this.reset();
    return email;
  },
  getEmails() {
    const _emails = _.cloneDeep(emails) || [];
    this.reset();
    return _emails;
  },
  on: {},
  alter: {
    emailSend(send, mail, cb) {
      // Only cache 10 emails.
      if (emails.length > 9) {
        emails.shift();
      }
      emails.push(mail);

      // If events are enabled
      if (Emailer.events) {
        Emailer.events.emit('newMail', mail);
      }
      else {
        console.error(`No event emitter is available`); // eslint-disable-line
      }

      return cb(null, false);
    }
  }
};

module.exports = Emailer;
