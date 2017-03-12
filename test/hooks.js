'use strict';

let _ = require('lodash');
let emails = [];
let Emailer = {
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

      return cb(null, false);
    }
  }
};

module.exports = Emailer;
