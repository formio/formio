'use strict';

const prompt = require('prompt');
const async = require('async');
const fs = require('fs-extra');
const nunjucks = require('nunjucks');
nunjucks.configure([], {watch: false});
const util = require('./src/util/util');
const debug = require('debug')('formio:error');

module.exports = function(formio, items, done) {
  // The project that was created.
  let project = {};

  let templateFile = '';

  // All the steps in the installation.
  const steps = {
    /**
     * Select the template to use.
     *
     * @param done
     * @return {*}
     */
    whatTemplate: function(done) {
      if (process.env.ROOT_EMAIL) {
        templateFile = './default-template.json';
        return done();
      }

      let message = '\nWhich project template would you like to install?\n'.green;
      message += '\n   Please provide the local file path of the template file.'.yellow;
      message += '\n   Or, just press '.yellow + 'ENTER'.green + ' to use the default template.\n'.yellow;
      util.log(message);
      prompt.get([
        {
          name: 'templateFile',
          description: 'Enter a local file path or press Enter for the default template.',
          default: './default-template.json',
          required: true
        }
      ], function(err, results) {
        if (err) {
          return done(err);
        }
        if (!results.templateFile) {
          return done('Cannot find the template file!'.red);
        }

        templateFile = results.templateFile;
        done();
      });
    },

    /**
     * Import the template.
     * @param done
     */
    importTemplate: function(done) {
      if (!items.import) {
        return done();
      }

      // Determine if this is a custom project.
      if (!fs.existsSync(templateFile)) {
        util.log(templateFile);
        return done('Cannot find the template file!'.red);
      }

      let template = {};
      try {
        template = JSON.parse(fs.readFileSync(templateFile));
      }
      catch (err) {
        debug(err);
        return done(err);
      }

      // Get the form.io service.
      util.log('Importing template...'.green);
      const importer = require('./src/templates/import')({formio: formio});
      importer.template(template, function(err, template) {
        if (err) {
          return done(err);
        }

        project = template;
        done(null, template);
      });
    },

    /**
     * Create the root user object.
     *
     * @param done
     */
    createRootUser: function(done) {
      if (process.env.ROOT_EMAIL) {
        prompt.override = {
          email: process.env.ROOT_EMAIL,
          password: process.env.ROOT_PASSWORD
        };
      }
      if (!items.user) {
        return done();
      }
      util.log('Creating root user account...'.green);
      prompt.get([
        {
          name: 'email',
          description: 'Enter your email address for the root account.',
          pattern: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
          message: 'Must be a valid email',
          required: true
        },
        {
          name: 'password',
          description: 'Enter your password for the root account.',
          require: true,
          hidden: true
        }
      ], function(err, result) {
        if (err) {
          return done(err);
        }

        util.log('Encrypting password');
        formio.encrypt(result.password, function(err, hash) {
          if (err) {
            return done(err);
          }

          // Create the root user submission.
          util.log('Creating root user account');
          formio.resources.submission.model.create({
            form: project.resources.admin._id,
            data: {
              email: result.email,
              password: hash
            },
            roles: [
              project.roles.administrator._id
            ]
          }, function(err, item) {
            if (err) {
              return done(err);
            }

            done();
          });
        });
      });
    }
  };

  util.log('Installing...');
  prompt.start();
  async.series([
    steps.whatTemplate,
    steps.importTemplate,
    steps.createRootUser
  ], function(err, result) {
    if (err) {
      util.log(err);
      return done(err);
    }

    util.log('Install successful!'.green);
    done();
  });
};
