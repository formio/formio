module.exports = function (app, template, hook) {
  const assert = require('assert');
  const { DefaultEvaluator, registerEvaluator } = require('@formio/nextgen');
  const { renderSubmission } = require('../../../src/export/nextgen/NextgenCsvRenderer');

  describe('NextgenCsvRenderer', () => {
    it('renders a single textfield submission to its display value keyed by data path', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [{ type: 'textfield', key: 'name', label: 'Name' }],
      };

      const result = await renderSubmission(form, { data: { name: 'hello' } });

      assert.deepEqual(result, { name: 'hello' });
    });

    it('renders without evaluating form JS on the host', async () => {
      let evalCount = 0;
      class CountingEvaluator extends DefaultEvaluator {
        evaluate(...args) {
          evalCount++;
          return super.evaluate(...args);
        }
        evaluateAsync(...args) {
          evalCount++;
          return super.evaluateAsync(...args);
        }
      }
      registerEvaluator(new CountingEvaluator());

      try {
        const form = {
          type: 'form',
          display: 'form',
          components: [
            { type: 'textfield', key: 'name', label: 'Name' },
            {
              type: 'textfield',
              key: 'secret',
              label: 'Secret',
              customConditional: 'show = data.name === "reveal";',
            },
          ],
        };

        await renderSubmission(form, { data: { name: 'hello', secret: 'x' } });

        assert.equal(evalCount, 0, 'CSV render must not evaluate form JS on the host');
      } finally {
        registerEvaluator(new DefaultEvaluator());
      }
    });

    it('renders the stored value, not the display label', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [{ type: 'checkbox', key: 'agree', label: 'Agree' }],
      };

      const result = await renderSubmission(form, { data: { agree: true } });

      assert.deepEqual(result, { agree: 'true' });
    });

    it('renders display values (view) in formatted mode', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [{ type: 'checkbox', key: 'agree', label: 'Agree' }],
      };

      const result = await renderSubmission(form, { data: { agree: true } }, { formatted: true });

      assert.deepEqual(result, { agree: 'Yes' });
    });

    it('renders only data-bearing fields, excluding layout components', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'panel',
            key: 'info',
            label: 'Info',
            scope: 'display',
            components: [{ type: 'textfield', key: 'name', label: 'Name' }],
          },
        ],
      };

      const result = await renderSubmission(form, { data: { name: 'hello' } });

      assert.deepEqual(result, { name: 'hello' });
    });

    it('handles keyless layout components (legacy forms)', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'panel',
            label: 'Info',
            scope: 'display',
            components: [{ type: 'textfield', key: 'name', label: 'Name' }],
          },
        ],
      };

      const result = await renderSubmission(form, { data: { name: 'hello' } });

      assert.deepEqual(result, { name: 'hello' });
    });

    it('excludes buttons and passwords from columns', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
          { type: 'button', key: 'submit', label: 'Submit' },
          { type: 'password', key: 'secret', label: 'Secret' },
        ],
      };

      const result = await renderSubmission(form, { data: { name: 'hello', secret: 'hunter2' } });

      assert.deepEqual(result, { name: 'hello' });
    });

    it('excludes client-only (non-persisted) fields from columns', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
          { type: 'textfield', key: 'confirm', label: 'Confirm', persistent: 'client-only' },
        ],
      };

      const result = await renderSubmission(form, { data: { name: 'Bob', confirm: 'x' } });

      assert.deepEqual(result, { name: 'Bob' });
    });

    it('collapses a multiple-value field to a single column, not per-row columns', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
          { type: 'textfield', key: 'aliases', label: 'Aliases', multiple: true },
        ],
      };

      const result = await renderSubmission(form, {
        data: { name: 'Bob', aliases: ['hello, world', 'foo'] },
      });

      assert.deepEqual(result, { name: 'Bob', aliases: '["hello, world","foo"]' });
    });

    it('excludes a structural container not named by any type list', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
          {
            type: 'form',
            key: 'child',
            label: 'Child',
            components: [{ type: 'textfield', key: 'inner', label: 'Inner' }],
          },
        ],
      };

      const result = await renderSubmission(form, {
        data: { name: 'Bob', child: { data: { inner: 'x' } } },
      });

      assert.equal(result.name, 'Bob');
      assert.ok(!('child' in result), 'nested form wrapper must not be a column');
    });

    it('prefix-expands nested form fields, not colliding with root fields', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
          {
            type: 'form',
            key: 'child',
            label: 'Child',
            components: [
              { type: 'textfield', key: 'age', label: 'Age' },
              { type: 'textfield', key: 'name', label: 'Inner Name' },
            ],
          },
        ],
      };

      const result = await renderSubmission(form, {
        data: { name: 'Bob', child: { data: { age: '23', name: 'Junior' } } },
      });

      assert.deepEqual(result, { name: 'Bob', 'child.age': '23', 'child.name': 'Junior' });
    });

    it('serializes object and array leaf values as JSON', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          { type: 'address', key: 'addr', label: 'Addr' },
          { type: 'file', key: 'doc', label: 'Doc' },
        ],
      };

      const result = await renderSubmission(form, {
        data: {
          addr: { formattedPlace: '1 Main St', lat: 1 },
          doc: [{ name: 'a.pdf', url: 'http://x/a.pdf' }],
        },
      });

      assert.deepEqual(result, {
        addr: '{"formattedPlace":"1 Main St","lat":1}',
        doc: '[{"name":"a.pdf","url":"http://x/a.pdf"}]',
      });
    });

    it('serializes a datagrid as a single JSON column', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'datagrid',
            key: 'items',
            label: 'Items',
            components: [
              { type: 'textfield', key: 'sku', label: 'SKU' },
              { type: 'textfield', key: 'name', label: 'Name' },
            ],
          },
        ],
      };

      const result = await renderSubmission(form, {
        data: {
          items: [
            { sku: 'A', name: 'Apple' },
            { sku: 'B', name: 'Banana' },
          ],
        },
      });

      assert.deepEqual(result, {
        items: '[{"sku":"A","name":"Apple"},{"sku":"B","name":"Banana"}]',
      });
    });

    it('serializes an editgrid as a single JSON column', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'editgrid',
            key: 'rows',
            label: 'Rows',
            components: [
              { type: 'textfield', key: 'item', label: 'Item' },
              { type: 'number', key: 'qty', label: 'Qty' },
            ],
          },
        ],
      };

      const result = await renderSubmission(form, {
        data: {
          rows: [
            { item: 'A', qty: 2 },
            { item: 'B', qty: 5 },
          ],
        },
      });

      assert.deepEqual(result, {
        rows: '[{"item":"A","qty":2},{"item":"B","qty":5}]',
      });
    });

    it('exports the stored value for url-sourced components', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'radio',
            key: 'color',
            label: 'Color',
            dataSrc: 'url',
            valueProperty: 'id',
            template: '<span>{{ item.label }}</span>',
            data: { url: 'https://example.com/colors' },
          },
        ],
      };
      const submission = {
        data: { color: 'r' },
        metadata: { selectData: { color: { label: 'Red' } } },
      };

      const result = await renderSubmission(form, submission);

      assert.deepEqual(result, { color: 'r' });
    });

    it('resolves url-sourced labels from metadata in formatted mode', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'radio',
            key: 'color',
            label: 'Color',
            dataSrc: 'url',
            valueProperty: 'id',
            template: '<span>{{ item.label }}</span>',
            data: { url: 'https://example.com/colors' },
          },
        ],
      };
      const submission = {
        data: { color: 'r' },
        metadata: { selectData: { color: { label: 'Red' } } },
      };

      const result = await renderSubmission(form, submission, { formatted: true });

      assert.deepEqual(result, { color: 'Red' });
    });

    it('expands a selectboxes value into one column per option', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'selectboxes',
            key: 'colors',
            values: [
              { value: 'r', label: 'Red' },
              { value: 'g', label: 'Green' },
            ],
          },
        ],
      };

      const result = await renderSubmission(form, { data: { colors: { r: true, g: false } } });

      assert.deepEqual(result, { 'colors.r': true, 'colors.g': false });
    });

    it('expands a survey value into one column per question', async () => {
      const form = {
        type: 'form',
        display: 'form',
        components: [
          {
            type: 'survey',
            key: 'feedback',
            questions: [
              { value: 'q1', label: 'Q1' },
              { value: 'q2', label: 'Q2' },
            ],
            values: [
              { value: 'good', label: 'Good' },
              { value: 'bad', label: 'Bad' },
            ],
          },
        ],
      };

      const result = await renderSubmission(form, {
        data: { feedback: { q1: 'good', q2: 'bad' } },
      });

      assert.deepEqual(result, { 'feedback.q1': 'good', 'feedback.q2': 'bad' });
    });
  });
};
