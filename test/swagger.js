/* eslint-env mocha */
'use strict';

const assert = require('assert');
const _ = require('lodash');
const { Resource } = require('resourcejs');
const swagger = require('../src/util/swagger');

/**
 * Build a minimal path-shaped entry that resourcejs Swagger can convert.
 */
const makePath = (type) => ({
  options: { type },
  enumValues: [],
});

/**
 * Build a router stub that drives swagger() for the all-forms (no formId) path.
 */
const buildRouter = (forms, schemaPaths, swaggerImpl) => {
  let selectArgs = null;
  const query = {
    select(fields) {
      selectArgs = fields;
      return this;
    },
    lean() {
      return this;
    },
    exec() {
      return Promise.resolve(forms);
    },
  };

  const submissionResource = {
    methods: ['index', 'post', 'get', 'put', 'delete'],
    model: {
      schema: {
        paths: schemaPaths,
      },
    },
    // Minimal stub — production uses resourcejs Resource.swagger; we only need
    // definitions keyed by modelName so submissionSwagger can merge getDefinition.
    swagger:
      swaggerImpl ||
      function () {
        return {
          paths: {
            [this.route]: {
              get: {},
              post: {},
            },
          },
          definitions: {
            [this.modelName]: {
              properties: {},
              required: [],
            },
          },
        };
      },
  };

  return {
    selectArgs: () => selectArgs,
    formio: {
      config: {
        baseUrl: 'localhost',
        protocol: 'http',
      },
      hooks: {},
      resources: {
        form: {
          model: {
            find() {
              return query;
            },
          },
        },
        submission: submissionResource,
      },
    },
  };
};

module.exports = function () {
  describe('Swagger Spec Generation', function () {
    const schemaPaths = {
      data: makePath(Object),
      created: makePath(Date),
      modified: makePath(Date),
      deleted: makePath(Number),
      __v: makePath(Number),
      machineName: makePath(String),
    };

    const forms = [
      {
        path: 'one',
        title: 'Form One',
        name: 'formOne',
        components: [{ type: 'textfield', key: 'firstName', validate: { required: true } }],
      },
      {
        path: 'two',
        title: 'Form Two',
        name: 'formTwo',
        components: [{ type: 'number', key: 'age' }],
      },
    ];

    it('selects only fields required for swagger when loading all forms', function (done) {
      const router = buildRouter(forms, schemaPaths);
      const req = {};

      swagger(req, router, function (spec) {
        try {
          assert.ok(spec, 'expected a swagger spec');
          assert.ok(router.selectArgs(), 'expected form query to call .select()');
          const selected = router.selectArgs();
          // Accept string or object projection; require the swagger fields.
          const selectedStr =
            typeof selected === 'string' ? selected : Object.keys(selected).join(' ');
          ['path', 'title', 'name', 'components'].forEach((field) => {
            assert.ok(
              selectedStr.includes(field) || selected[field],
              `expected .select() to include "${field}", got ${JSON.stringify(selected)}`,
            );
          });
          done();
        } catch (err) {
          done(err);
        }
      }).catch(done);
    });

    it('clones submission schema paths once when generating swagger for multiple forms', async function () {
      const router = buildRouter(forms, schemaPaths);
      const originalCloneDeep = _.cloneDeep;
      let schemaPathsCloneCount = 0;
      let spec;

      _.cloneDeep = function (value) {
        if (value === schemaPaths) {
          schemaPathsCloneCount += 1;
        }
        return originalCloneDeep.apply(this, arguments);
      };

      try {
        await swagger({}, router, (result) => {
          spec = result;
        });
      } finally {
        _.cloneDeep = originalCloneDeep;
      }

      assert.ok(spec.paths, 'expected swagger paths');
      assert.strictEqual(
        schemaPathsCloneCount,
        1,
        `expected schema.paths to be cloneDeep'd once for ${forms.length} forms, got ${schemaPathsCloneCount}`,
      );
    });

    it('produces isolated per-form definitions from the shared submission schema paths', async function () {
      const router = buildRouter(forms, schemaPaths, Resource.prototype.swagger);
      let spec;

      await swagger({}, router, (result) => {
        spec = result;
      });

      assert.deepStrictEqual(Object.keys(spec.definitions.formOneData.properties), ['firstName']);
      assert.deepStrictEqual(Object.keys(spec.definitions.formTwoData.properties), ['age']);
      assert.deepStrictEqual(spec.definitions.formOneData.required, ['firstName']);
      assert.deepStrictEqual(spec.definitions.formTwoData.required, []);

      assert.deepStrictEqual(
        Object.keys(spec.definitions.formOne.properties).sort(),
        Object.keys(spec.definitions.formTwo.properties).sort(),
      );
      assert.ok(
        !Object.prototype.hasOwnProperty.call(spec.definitions.formOne.properties, 'age'),
        'form one must not pick up form two properties',
      );
    });
  });
};
