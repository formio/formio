var _ = require('lodash');
var emails = [];
var emailCallback = null;
var emailExpects = 0;
var emailCounter = 0;
var Emailer = {
  reset: function() {
    emailCounter = 0;
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
    var email = _.clone(emails[(emails.length - 1)]);
    Emailer.reset();
    return email;
  },
  getEmails: function() {
    var _emails = _.clone(emails);
    Emailer.reset();
    return _emails;
  },
  on: {
    email: function(transport, mail) {
      if (emails.length > 9) {
        emails.shift();
      }
      emails.push(mail);
      if (emailCallback && (++emailCounter >= emailExpects)) {
        emailCallback(Emailer.getEmails());
      }
    }
  }
};

module.exports = Emailer;