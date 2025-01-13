'use strict';

const prompt = require('prompt');
const fs = require('fs-extra');
const nunjucks = require('nunjucks');
nunjucks.configure([], {watch: false});
const util = require('./src/util/util');
const debug = require('debug')('formio:error');

module.exports = async function(formio, items, done) {
  // The project that was created.
  let project = {};

  let templateFile = '';

  // All the steps in the installation.
  const steps = {
    /**
     * Select the template to use.
     *
     * @return {*}
     */
    whatTemplate: async function() {
      if (process.env.ROOT_EMAIL) {
        templateFile = './default-template.json';
        return;
      }

      let message = '\nWhich project template would you like to install?\n'.green;
      message += '\n   Please provide the local file path of the template file.'.yellow;
      message += '\n   Or, just press '.yellow + 'ENTER'.green + ' to use the default template.\n'.yellow;
      util.log(message);
      const results = await prompt.get([
        {
          name: 'templateFile',
          description: 'Enter a local file path or press Enter for the default template.',
          default: './default-template.json',
          required: true
        }
      ]);

      if (!results.templateFile) {
        throw ('Cannot find the template file!'.red);
      }
      templateFile = results.templateFile;
    },

    /**
     * Import the template.
     * @param done
     */
    importTemplate: async function() {
      if (!items.import) {
        return;
      }

      // Determine if this is a custom project.
      if (!fs.existsSync(templateFile)) {
        util.log(templateFile);
        throw ('Cannot find the template file!'.red);
      }

      let template = {};
      try {
        template = JSON.parse(fs.readFileSync(templateFile));
      }
      catch (err) {
        debug(err);
        throw err;
      }

      // Get the form.io service.
      util.log('Importing template...'.green);
      const importer = require('./src/templates/import')({formio: formio});
      const importedTemplate = await importer.template(template);

      project = importedTemplate;
      return importedTemplate;
    },

    /**
     * Create the root user object.
     *
     * @param done
     */
    createRootUser: async function(done) {
      if (process.env.ROOT_EMAIL) {
        prompt.override = {
          email: process.env.ROOT_EMAIL,
          password: process.env.ROOT_PASSWORD
        };
      }
      if (!items.user) {
        return;
      }
      util.log('Creating root user account...'.green);
      const result = await prompt.get([
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
      ]);

      util.log('Encrypting password');
      formio.encrypt(result.password, async function(err, hash) {
        // Create the root user submission.
        util.log('Creating root user account');
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
        return;
      });
    }
  };

  util.log('Installing...');
  prompt.start();

  try {
    await steps.whatTemplate(),
    await steps.importTemplate(),
    await steps.createRootUser();
    util.log('Install successful!'.green);
  }
  catch (err) {
    util.log(err);
    throw err;
  }
};
