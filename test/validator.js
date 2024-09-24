'use strict';

const request = require('./formio-supertest');
const assert = require('assert');
const Validator = require('../src/resources/Validator');

module.exports = function(app, template, hook) {
  const formio = hook.alter('formio', app.formio);

  describe('Validator tests', function() {
    let testResourceWithFlatComponents;
    let testResourceWithNestedComponents;
    let resourceWithFlatComponentsId;
    let resourceWithNestedComponentsId;
    before(function() {
      testResourceWithFlatComponents = {
        title: 'fields',
        name: 'fields',
        path: 'fields',
        type: 'resource',
        display: 'form',
        access: [],
        submissionAccess: [],
        owner: null,
        components: [
          {
            label: '1 - Text Field',
            placeholder: 'Text Field',
            tableView: true,
            key: 'TextField',
            type: 'textfield',
            input: true
          },
          {
            label: '2 - Email',
            placeholder: 'Email',
            tableView: true,
            key: 'Email',
            type: 'email',
            input: true
          },
          {
            label: '3 - Text Area',
            placeholder: 'Text Area',
            tableView: true,
            key: 'TextArea',
            type: 'textarea',
            input: true
          },
          {
            label: '4 - Checkbox',
            tableView: true,
            key: 'Checkbox',
            type: 'checkbox',
            input: true
          },
        ],
      };
      testResourceWithNestedComponents = {
        title: 'nested fields',
        name: 'nestedFields',
        path: 'nestedFields',
        type: 'resource',
        display: 'form',
        access: [],
        submissionAccess: [],
        owner: null,
        components: [
          {
            label: 'Text Field',
            tableView: true,
            key: 'textField',
            type: 'textfield',
            input: true
          },
          {
            collapsible: false,
            key: 'panel',
            type: 'panel',
            label: 'Panel',
            input: false,
            tableView: false,
            components: [
              {
                label: 'Text Field',
                tableView: true,
                key: 'textField1',
                type: 'textfield',
                input: true
              },
              {
                label: 'Container',
                key: 'container',
                type: 'container',
                input: true,
                components: [
                  {
                    label: 'Text Field',
                    tableView: true,
                    key: 'textField',
                    type: 'textfield',
                    input: true
                  }
                ]
              }
            ]
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false
          }
        ],
      };
    });

    it('Bootstrap', function(done) {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send(testResourceWithFlatComponents)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          resourceWithFlatComponentsId = response._id;

          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(testResourceWithNestedComponents)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              resourceWithNestedComponentsId = response._id;

              done();
            });
        });
    });

    it('Should filter resource components based on data table settings', function(done) {
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
        },
        formio.resources.submission.model,
        formio.resources.submission,
        formio.cache,
        formio.resources.form.model,
        formio.mongoose.models.token,
        hook,
      );
      const dataTableComponent = {
        type: 'datatable',
        fetch: {
          enableFetch: true,
          components: [
            {
              path: 'TextField',
              key: 'TextField'
            },
            {
              path: 'TextArea',
              key: 'TextArea'
            }
          ],
          dataSrc: 'resource',
          resource: resourceWithFlatComponentsId,
        },
      };
      validator
        .dereferenceDataTableComponent(dataTableComponent)
        .then((components) => {
          assert.deepEqual(components, [
            {
              label: '1 - Text Field',
              placeholder: 'Text Field',
              tableView: true,
              key: 'TextField',
              type: 'textfield',
              input: true
            },
            {
              label: '3 - Text Area',
              placeholder: 'Text Area',
              tableView: true,
              key: 'TextArea',
              type: 'textarea',
              input: true
            },
          ]);

          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('Should filter nested resource components based on data table settings', function(done) {
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
        },
        formio.resources.submission.model,
        formio.resources.submission,
        formio.cache,
        formio.resources.form.model,
        formio.mongoose.models.token,
        hook,
      );
      const dataTableComponent = {
        type: 'datatable',
        fetch: {
          enableFetch: true,
          components: [
            {
              path: 'textField',
              key: 'textField'
            },
            {
              path: 'container.textField',
              key: 'container.textField'
            }
          ],
          dataSrc: 'resource',
          resource: resourceWithNestedComponentsId,
        },
      };
      validator
        .dereferenceDataTableComponent(dataTableComponent)
        .then((components) => {
          assert.deepEqual(components, [
            {
              label: 'Text Field',
              tableView: true,
              key: 'textField',
              type: 'textfield',
              input: true
            },
            {
              collapsible: false,
              key: 'panel',
              type: 'panel',
              label: 'Panel',
              input: false,
              tableView: false,
              components: [
                {
                  label: 'Container',
                  key: 'container',
                  type: 'container',
                  input: true,
                  components: [
                    {
                      label: 'Text Field',
                      tableView: true,
                      key: 'textField',
                      type: 'textfield',
                      input: true
                    }
                  ]
                }
              ]
            },
          ]);

          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    after(function(done) {
      request(app)
        .delete(hook.alter('url', `/form/${resourceWithFlatComponentsId}`, template))
        .set('x-jwt-token', template.users.admin.token)
        .expect('Content-Type', /text/)
        .expect(200)
        .end(function(err) {
          if (err) {
            return done(err);
          }

          request(app)
            .delete(hook.alter('url', `/form/${resourceWithNestedComponentsId}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /text/)
            .expect(200)
            .end(function(err) {
              if (err) {
                return done(err);
              }

              done();
            });
        });
    });
  });
};
