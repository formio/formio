var _ = require('lodash');
var emails = [];
module.exports = {
  getLastEmail: function() {
    var email = _.clone(emails[(emails.length - 1)]);
    emails = [];
    return email;
  },
  getEmails: function() {
    var _emails = _.clone(emails);
    emails = [];
    return _emails;
  },
  on: {
    email: function(transport, mail) {
      if (emails.length > 9) {
        emails.shift();
      }
      emails.push(mail);
    }
  }
};