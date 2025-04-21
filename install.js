'use strict';

const prompt = require('prompt');
const async = require('async');
const fs = require('fs-extra');
const nunjucks = require('nunjucks');
nunjucks.configure([], {watch: false});
const util = require('./src/util/util');
const {logger} = require('@formio/logger');
const installLogger = logger.child({module: 'formio:install'});

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
        installLogger.error({templateFile});
        return done('Cannot find the template file!'.red);
      }

      let template = {};
      try {
        template = JSON.parse(fs.readFileSync(templateFile));
      }
      catch (err) {
        installLogger.error(err);
        return done(err);
      }

      // Get the form.io service.
      installLogger.info('Importing template');
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

      installLogger.info('Creating root user account');
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
          installLogger.error(err);
          return done(err);
        }

        installLogger.info('Encrypting password');
        formio.encrypt(result.password, async function(err, hash) {
          if (err) {
            installLogger.error(err);
            return done(err);
          }

          // Create the root user submission.
          installLogger.info('Creating root user account');
          try {
          await formio.resources.submission.model.create({
            form: project.resources.admin._id,
            data: {
              email: result.email,
              password: hash
            },
            roles: [
              project.roles.administrator._id
            ]
          });
          return done();
          }
          catch (err) {
            installLogger.error(err);
            return done(err);
          }
        });
      });
    }
  };

  installLogger.info('Installing...');
  prompt.start();
  async.series([
    steps.whatTemplate,
    steps.importTemplate,
    steps.createRootUser
  ], function(err, result) {
    if (err) {
      installLogger.error(err);
      return done(err);
    }

    installLogger.info('Install successful!');
    done();
  });
};
