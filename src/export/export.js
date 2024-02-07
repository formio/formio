'use strict';

const exporters = require('.');
const _ = require('lodash');
const through = require('through');
const ResourceFactory = require('resourcejs');
const debug = require('debug')('formio:error');

module.exports = (router) => {
  const hook = require('../util/hook')(router.formio);
  /* eslint-disable new-cap */
  const resource = ResourceFactory(
    router,
    '/form/:formId/export',
    'export',
    router.formio.mongoose.model('submission'),
    {
      convertIds: /(^|\.)(_id|form|owner)$/
    }
  );
  /* eslint-enable new-cap */

  // Mount the export endpoint using the url.
  router.get('/form/:formId/export', (req, res, next) => {
    if (!req.isAdmin && !_.has(req, 'token.user._id')) {
      return res.sendStatus(400);
    }

    // Get the export format.
    const format = (req.query && req.query.format)
      ? req.query.format.toLowerCase()
      : 'json';

    // Handle unknown formats.
    if (!exporters.hasOwnProperty(format)) {
      return res.status(400).send('Unknown format');
    }

    // Load the form.
    router.formio.cache.loadCurrentForm(req, async (err, form) => {
      if (err) {
        return res.sendStatus(401);
      }
      if (!form) {
        return res.sendStatus(404);
      }

      // Allow them to provide a query.
      let query = {};
      if (req.headers.hasOwnProperty('x-query')) {
        try {
          query = JSON.parse(req.headers['x-query']);
        }
        catch (e) {
          debug(e);
          router.formio.util.log(e);
        }
      }
      else {
        query = resource.getFindQuery(req, {
          queryFilter: true
        });
      }

      // Enforce the form.
      query.form = form._id;

      // Only show non-deleted items unless specified
      if (query && !query.hasOwnProperty('deleted')) {
        query.deleted = {$eq: null};
      }

      // Function for populate pages in wizard
      const populateWizardComponents = (components, callback) => {
        return components.map(page => {
          return callback(page.components)
                  .then(result => {
                    page.components = result;

                    return page;
                  });
        });
      };

      // Populate all subform components
      const getSubForms = (components) => {
        if (!components) {
          return Promise.resolve(components);
        }
        if (components.noRecurse) {
          return Promise.resolve(components);
        }
        components.noRecurse = true;
        const newComponents = components.map(component => {
          if (component.type === 'form' && component.form) {
            const subForm = router.formio.mongoose.models.form.findById(component.form)
              .select('-_id -owner -_vid -__v').lean();

            return subForm.then(resultForm => {
              resultForm.label = component.label;
              resultForm.key = component.key;

              if (resultForm.display === 'wizard') {
                const subformComponents = populateWizardComponents(resultForm.components, getSubForms);

                return Promise.all(subformComponents)
                  .then(result => {
                    resultForm.components = result;
                    return resultForm;
                  });
              }
              else {
                return getSubForms(resultForm.components)
                  .then(res => {
                    resultForm.components = res;

                    return resultForm;
                  });
              }
            });
          }

          return component;
        });
        return Promise.all(newComponents);
      };

      // Replace form components to populated subforms
      /* eslint-disable require-atomic-updates */
      if (form.display === 'wizard') {
        const components = populateWizardComponents(form.components, getSubForms);
        form.components = await Promise.all(components);
      }
      else {
        form.components = await getSubForms(form.components);
      }
      /* eslint-enable require-atomic-updates */

      // Create the exporter.
      const exporter = new exporters[format](form, req, res);

      // Allow an alter of the export logic.
      hook.alter('export', req, query, form, exporter, (err) => {
        if (err) {
          return res.status(400).send(err.message);
        }

        // Initialize the exporter.
        exporter.init()
          .then(async () => {
            const submissionModel = req.submissionModel || router.formio.resources.submission.model;
            const addSubData = async (data) => {
              // Create new data
              const newData = {};
              // Array for promises
              const promises = [];

              _.each(data, (field, key) => {
                if (field && field._id) {
                  // Add data property for resource fields
                  promises.push(
                    submissionModel.findById(field._id).populate('form').select('form data')
                      .then(result => {
                        if (!result) {
                          return;
                        }

                        // Recurse for nested resources
                        return addSubData(result.data)
                          .then(res => newData[key] = {data: res});
                      })
                      .catch((error) => {
                        debug(error);
                        newData[key] = field;
                      })
                  );
                }
                else {
                  if (req.encryptedComponents && Object.keys(req.encryptedComponents).includes(key) && field) {
                    newData[key] = hook.alter('decrypt', req, field);
                  }
                  else {
                    newData[key] = field;
                  }
                }
              });
              await Promise.all(promises);
              return newData;
            };

            // Skip this owner filter, if the user is the admin or owner.
            if (req.skipOwnerFilter !== true && req.isAdmin !== true) {
              // The default ownerFilter query.
              query.owner = router.formio.util.ObjectId(req.token.user._id);
            }

            // Create the query stream.
            const cursor = submissionModel.find(hook.alter('submissionQuery', query, req))
              .sort('-created').lean().cursor();
            const promises = [];

            const stream = cursor.pipe(through(function(row) {
              // Doesn`t write to stream before promise resolve
              this.pause();
             promises.push(
              addSubData(row.data).then((data) => {
                row.data = data;
                // Resumes writing to stream
                this.resume();
                router.formio.util.removeProtectedFields(form, 'export', row);
                this.queue(row);
              })
             );
            }), {end: false});
            // If the DB cursor throws an error, send the error.
            cursor.on('error', (error) => {
              debug(error);
              router.formio.util.log(error);
              next(error);
            });
            // When the DB cursor ends, allow the output stream a tick to perform the last write,
            // then manually end it by pushing a null item to the output stream's queue
            cursor.on('end',() => Promise.all(promises).then(() => process.nextTick(() => stream.queue(null))));
            // Create the stream.
            return exporter.stream(stream);
          })
          .catch((error) => {
            // Send the error.
            next(error);
          });
      });
    });
  });
};
