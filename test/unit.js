/* eslint-env mocha */
'use strict';

var assert = require('assert');

module.exports = function(app, template, hook) {

  /**
   * Unit tests for various parts of the platform.
   */
  describe('Nunjucks Rendering', function() {
    var nunjucks = require('../src/util/nunjucks');

    nunjucks.environment.addFilter('test', function(string, param) {
      var retVal = this.env.params.form + ' : ' + string;
      if (param) {
        retVal += ' : ' + param;
      }
      return retVal;
    });

    it('Should render a string with tokens', function(done) {
      var test = nunjucks.render('{{ data.firstName }} {{ data.lastName }}', {
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      });
      assert.equal(test, 'Travis Tidwell');
      done();
    });

    it('Should timeout if someone puts bad code in the template', function(done) {
      var test = nunjucks.render('{{ callme() }}', {
        callme: function() {
          // Loop forever!!!!
          while (true) {};
        }
      })

      // FA-857 - No email will be sent if bad code if given.
      assert.equal(test, null);
      done();
    });

    it('Should not allow them to modify parameters in the template', function(done) {
      var params = {
        form: '123',
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      };

      nunjucks.environment.addFilter('test1', function(string) {
        return this.env.params.form + ' : ' + string;
      });

      var test = nunjucks.render('{% set form = "246" %}{{ form | test1 }} {{ data.firstName }} {{ data.lastName }}', params);
      assert.equal(test, '123 : 246 Travis Tidwell');
      done();
    });

    it('Should not expose private context variables.', function(done) {
      var params = {
        _private: {
          secret: '5678'
        },
        form: '123',
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      };
      var test = nunjucks.render('{{ _private.secret }}', params);
      assert.equal(test, '');
      done();
    });

    it('Should allow filters to have access to secret variables.', function(done) {
      var params = {
        _private: {
          secret: '5678'
        },
        form: '123',
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      };

      nunjucks.environment.addFilter('secret', function(string, param) {
        return this.env.params._private.secret;
      });

      var test = nunjucks.render('{{ "test" | secret }}', params);
      assert.equal(test, '5678');
      done();
    });
  });
};
