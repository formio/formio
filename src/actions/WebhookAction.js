'use strict';

const rest = require('restler');
const _ = require('lodash');
const FormioUtils = require('formiojs/utils');
const vm = require('vm');

module.exports = router => {
  const Action = router.formio.Action;
  const hook = router.formio.hook;

  /**
   * WebhookAction class.
   *   This class is used to create webhook interface.
   */
  class WebhookAction extends Action {
    constructor(data, req, res) {
      super(data, req, res);
    }

    static info(req, res, next) {
      next(null, hook.alter('actionInfo', {
        name: 'webhook',
        title: 'Webhook',
        description: 'Allows you to trigger an external interface.',
        priority: 0,
        defaults: {
          handler: ['after'],
          method: ['create', 'update', 'delete']
        }
      }));
    }
    /* eslint-disable max-len */
    static settingsForm(req, res, next) {
      next(null, [
        {
          clearOnHide: false,
          label: "Columns",
          input: false,
          key: "columns",
          columns: [
            {
              components: [
                {
                  input: true,
                  label: "Request Method",
                  key: "method",
                  placeholder: "Match",
                  data: {
                    values: [
                      {
                        value: "",
                        label: "Match"
                      },
                      {
                        value: "get",
                        label: "GET"
                      },
                      {
                        value: "post",
                        label: "POST"
                      },
                      {
                        value: "put",
                        label: "PUT"
                      },
                      {
                        value: "delete",
                        label: "DELETE"
                      },
                      {
                        value: "patch",
                        label: "PATCH"
                      }
                    ],
                  },
                  dataSrc: "values",
                  valueProperty: "value",
                  template: "<span>{{ item.label }}</span>",
                  persistent: true,
                  type: "select",
                  description: "If set to Match it will use the same Request Type as sent to the Form.io server."
                }
              ],
              width: 2,
              offset: 0,
              push: 0,
              pull: 0
            },
            {
              components: [
                {
                  label: 'Request URL',
                  key: 'url',
                  inputType: 'text',
                  defaultValue: '',
                  input: true,
                  placeholder: 'http://myreceiver.com/something.php',
                  prefix: '',
                  suffix: '',
                  type: 'textfield',
                  multiple: false,
                  validate: {
                    required: true
                  },
                  description: 'The URL the request will be made to. You can interpolate the URL with {{ data.myfield }} or {{ externalId }} variables.'
                },

              ],
              width: 10,
              offset: 0,
              push: 0,
              pull: 0
            }
          ],
          type: "columns",
        },
        {
          key: 'panel1',
          input: false,
          tableView: false,
          title: "HTTP Headers",
          components: [
            {
              type: 'checkbox',
              persistent: true,
              protected: false,
              defaultValue: false,
              key: 'forwardHeaders',
              label: 'Forward headers',
              tooltip: 'Pass on any headers received by the form.io server.',
              hideLabel: false,
              inputType: 'checkbox',
              input: true
            },
            {
              key: "fieldset",
              input: false,
              tableView: false,
              legend: "HTTP Basic Authentication (optional)",
              components: [
                {
                  label: 'Authorize User',
                  key: 'username',
                  inputType: 'text',
                  defaultValue: '',
                  input: true,
                  placeholder: 'User for Basic Authentication',
                  type: 'textfield',
                  multiple: false
                },
                {
                  label: 'Authorize Password',
                  key: 'password',
                  inputType: 'password',
                  defaultValue: '',
                  input: true,
                  placeholder: 'Password for Basic Authentication',
                  type: 'textfield',
                  multiple: false
                }
              ],
              type: "fieldset",
              label: "fieldset"
            },
            {
              input: true,
              tree: true,
              components: [
                {
                  input: true,
                  tableView: true,
                  inputType: "text",
                  label: "Header",
                  key: "header",
                  protected: false,
                  persistent: true,
                  clearOnHide: true,
                  type: "textfield",
                  inDataGrid: true,
                },
                {
                  input: true,
                  tableView: true,
                  inputType: "text",
                  label: "Value",
                  key: "value",
                  protected: false,
                  persistent: true,
                  clearOnHide: true,
                  type: "textfield",
                  inDataGrid: true,
                }
              ],
              label: "Additional Headers",
              key: "headers",
              persistent: true,
              type: "datagrid",
              addAnother: "Add Header"
            },
          ],
          type: "panel",
          label: "Panel"
        },
        {
          key: 'panel2',
          input: false,
          tableView: false,
          title: "Request Payload",
          components: [
            {
              key: "content",
              input: false,
              html: '<p>By default the request payload will contain an object with the following information:</p> <div style="background:#eeeeee;border:1px solid #cccccc;padding:5px 10px;">{<br /> &nbsp;&nbsp;request: request, // an object containing request body to the form.io server.<br /> &nbsp;&nbsp;response: response, // an object containing the server response from the form.io server.<br /> &nbsp;&nbsp;submission: submission, // an object containing the submission object from the request.<br /> &nbsp;&nbsp;params: params, // an object containing the params for the request such as query parameters or url parameters.<br /> }</div> <p>You can use the transform payload javascript to modify the contents of the payload that will be send in this webhook. The following variables are also available: headers</p>',
              type: "content",
              label: "content",
            },
            {
              autofocus: false,
              input: true,
              tableView: true,
              label: "Transform Payload",
              key: "transform",
              placeholder: "/** Example Code **/\npayload = payload.submission.data;",
              rows: 8,
              multiple: false,
              defaultValue: "",
              protected: false,
              persistent: true,
              hidden: false,
              wysiwyg: false,
              spellcheck: true,
              type: "textarea",
              description: "Available variables are payload, externalId, and headers."
            }
          ],
          type: "panel",
          label: "Panel"
        },
        {
          key: 'panel3',
          type: 'panel',
          title: 'Response Payload',
          input: false,
          components: [
            {
              type: 'checkbox',
              persistent: true,
              protected: false,
              defaultValue: false,
              key: 'block',
              label: 'Wait for webhook response before continuing actions',
              hideLabel: false,
              inputType: 'checkbox',
              input: true
            },
            {
              key: "content",
              input: false,
              html: '<p>When making a request to an external service, you may want to save an external Id in association with this submission so you can refer to the same external resource later. To do that, enter an external ID reference name and the path to the id in the response data object. This value will then be available as {{externalId}} in the Request URL and Transform Payload fields.</p>',
              type: "content",
              label: "content",
            },
            {
              input: true,
              inputType: "text",
              label: "External Id Type",
              key: "externalIdType",
              multiple: false,
              protected: false,
              unique: false,
              persistent: true,
              type: "textfield",
              description: "The name to store and reference the external Id for this request",
            },
            {
              input: true,
              inputType: "text",
              label: "External Id Path",
              key: "externalIdPath",
              multiple: false,
              protected: false,
              clearOnHide: true,
              type: "textfield",
              description: "The path to the data in the webhook response object",
            }
          ]
        }
      ]);
    }

    /**
     * Trigger the webhooks.
     *
     * @param handler
     * @param method
     * @param req
     *   The Express request object.
     * @param res
     *   The Express response object.
     * @param next
     *   The callback function to execute upon completion.
     */
    /* eslint-disable max-statements */
    resolve(handler, method, req, res, next) {
      const settings = this.settings;

      /**
       * Util function to handle success for a potentially blocking request.
       *
       * @param data
       * @param response
       * @returns {*}
       */
      const handleSuccess = (data, response) => {
        if (_.has(settings, 'externalIdType') && _.has(settings, 'externalIdPath')) {
          const submissionModel = req.submissionModel || router.formio.resources.submission.model;
          submissionModel.findOne(
            {_id: _.get(res, 'resource.item._id'), deleted: {$eq: null}}
          ).exec(function(err, submission) {
            if (err) {
              return router.formio.util.log(err);
            }
            submission.externalIds = submission.externalIds || [];

            const type = _.get(settings, 'externalIdType');
            const id = _.get(data, _.get(settings, 'externalIdPath'), '');

            // Either update the existing ID or create a new one.
            let found = false;
            submission.externalIds.forEach(externalId => {
              if (externalId.type === type) {
                externalId.id = id;
                found = true;
              }
            });
            if (!found) {
              submission.externalIds.push({
                type,
                id
              });
            }
            submission.save(function(err, submission) {
              if (err) {
                return router.formio.util.log(err);
              }
            });
          });
        }

        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          return;
        }

        // Return response in metadata
        if (res && res.resource && res.resource.item) {
          res.resource.item.metadata = res.resource.item.metadata || {};
          res.resource.item.metadata[this.title] = data;
        }

        return next();
      };

      /**
       * Util function to handle errors for a potentially blocking request.
       *
       * @param data
       * @param response
       * @returns {*}
       */
      const handleError = (data, response) => {
        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          return;
        }

        return next(data.message || data || response.statusMessage);
      };

      try {
        if (!hook.alter('resolve', true, this, handler, method, req, res)) {
          return next();
        }

        // Continue if were not blocking
        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          next(); // eslint-disable-line callback-return
        }

        const submission = _.get(res, 'resource.item');
        const externalId = _.get(submission, _.get(settings, 'externalIdType', 'none'), '');

        const options = {};

        // Get the settings
        if (_.has(settings, 'username')) {
          options.username = _.get(settings, 'username');
        }
        if (_.has(settings, 'password')) {
          options.password = _.get(settings, 'password');
        }

        if (_.get(settings, 'forwardHeaders', false)) {
          options.headers = _.clone(req.headers);
        }
        else {
          options.headers = {
            'Accept': '*/*'
          };
        }
        // Always set user agent to indicate it came from us.
        options.headers['user-agent'] = 'Form.io Webhook Action';

        // Add custom headers.
        const headers = _.get(settings, 'headers', []);
        headers.forEach(header => {
          if (header && header.header) {
            options.headers[header.header] = header.value;
          }
        });

        // Cant send a webhook if the url isn't set.
        if (!_.has(settings, 'url')) {
          return handleError('No url given in the settings');
        }

        let url = this.settings.url;
        let payload = {
          request: _.get(req, 'body'),
          response: _.get(req, 'response'),
          submission: (submission && submission.toObject) ? submission.toObject() : {},
          params: _.get(req, 'params')
        };

        // Interpolate URL if possible
        if (res && res.resource && res.resource.item && res.resource.item.data) {
          // Interpolation data was originally just the data object itself. We have to move it to "data" so merge it as the root item.
          const data = _.clone(res.resource.item.data);
          data.data = res.resource.item.data;
          data.externalId = externalId;
          url = FormioUtils.interpolate(url, data);
        }

        // Fall back if interpolation failed
        if (!url) {
          url = this.settings.url;
        }

        // Allow user scripts to transform the payload.
        if (_.has(settings, 'transform')) {
          const script = new vm.Script(settings.transform);
          const sandbox = {
            externalId,
            payload,
            headers: options.headers
          };
          script.runInContext(vm.createContext(sandbox), {
            timeout: 500
          });
          payload = sandbox.payload;
        }

        // Use either the method specified in settings or the request method.
        const reqMethod = _.get(settings, 'method', req.method);

        // Make the request.
        switch (reqMethod.toLowerCase()) {
          case 'get':
            rest.get(url, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'post':
            rest.postJson(url, payload, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'put':
            rest.putJson(url, payload, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'patch':
            rest.patchJson(url, payload, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'delete':
            options.query = req.params;
            rest.del(url, options).on('success', handleSuccess).on('fail', handleError);
            break;
          default:
            return handleError(`Could not match request method: ${req.method.toLowerCase()}`);
        }
      }
      catch (e) {
        handleError(e);
      }
    }
  }

  // Return the WebhookAction.
  return WebhookAction;
};
