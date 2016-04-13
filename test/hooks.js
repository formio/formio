var lastEmail = null;
var _ = require('lodash');
module.exports = {
  getLastEmail: function() {
    var email = _.clone(lastEmail);
    lastEmail = null;
    return email;
  },
  on: {
    email: function(transport, mail) {
      lastEmail = mail;
    }
  }
};