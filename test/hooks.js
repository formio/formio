'use strict';

var _ = require('lodash');
var emails = [];
var emailCallback = null;
var emailExpects = 0;
var Emailer = {
  reset: function() {
    emails = [];
    emailCallback = null;
    emailExpects = 0;
  },
  onEmails: function(expects, cb) {
    Emailer.reset();
    emailExpects = expects;
    emailCallback = cb;
  },
  getLastEmail: function() {
    var email = _.cloneDeep(emails.pop()) || {};
    Emailer.reset();
    return email;
  },
  getEmails: function() {
    var _emails = _.cloneDeep(emails) || [];
    Emailer.reset();
    return _emails;
  },
  on: {
    email: function(transport, mail) {
      // Only cache 10 emails.
      if (emails.length > 9) {
        emails.shift();
      }
      emails.push(mail);

      if (emailCallback && (emails.length >= emailExpects)) {
        emailCallback(Emailer.getEmails());
      }
    }
  }
};

module.exports = Emailer;
