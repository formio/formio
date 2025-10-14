import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Formio } from '@formio/js';
import { FormioProvider } from '@formio/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { InfoPanelProvider } from '../src/hooks/useInfoPanelContext';
import App from '../src/components/App';

const server = setupServer(
  http.get('http://localhost:3002/current', () => {
    return HttpResponse.json({});
  }),
  http.get('http://localhost:3002/form', () => {
    return HttpResponse.json([]);
  })
);

beforeAll(() => {
  server.listen();
});

beforeEach(() => {
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
});

test('Clicking on + New Form button navigates you to the new form page', async () => {
  const newFormButton = await screen.findByText('+ New Form');
  await userEvent.click(newFormButton);
  expect(await screen.findByText('New Form'));
  expect(await screen.findByText('Form Title'));
  expect(await screen.findByText('Form Name'));
  expect(window.location.href).to.include('/newform');
});

test('Creating a new form should take you to edit form', async () => {
  server.use(
    http.get('/form/679bc82961e9293dee60f88a', () => {
      return HttpResponse.json({
        '_id': '679bc82961e9293dee60f88a',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'form',
        'display': 'form',
        'tags': [
          ''
        ],
        'owner': '679bc6e961e9293dee60f7fd',
        'components': [],
        'pdfComponents': [],
        'access': [
          {
            'type': 'read_all',
            'roles': [
              '679bc6de61e9293dee60f7aa',
              '679bc6de61e9293dee60f7ae',
              '679bc6de61e9293dee60f7b2'
            ]
          }
        ],
        'submissionAccess': [],
        'created': '2025-01-30T18:42:49.240Z',
        'modified': '2025-01-30T18:42:49.243Z',
        'machineName': 'test'
      });
    }),
    http.post('http://localhost:3002/form', () => {
      return HttpResponse.json({
        '_id': '679bc82961e9293dee60f88a',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'form',
        'display': 'form',
        'tags': [
          ''
        ],
        'owner': '679bc6e961e9293dee60f7fd',
        'components': [],
        'pdfComponents': [],
        'access': [
          {
            'type': 'read_all',
            'roles': [
              '679bc6de61e9293dee60f7aa',
              '679bc6de61e9293dee60f7ae',
              '679bc6de61e9293dee60f7b2'
            ]
          }
        ],
        'submissionAccess': [],
        'created': '2025-01-30T18:42:49.240Z',
        'modified': '2025-01-30T18:42:49.243Z',
        'machineName': 'test'
      });
    })
  );
  await userEvent.click(await screen.findByText('+ New Form'));
  await screen.findByText('Form Title');
  await userEvent.type(document.querySelector('[name="data[title]"]')!, 'test');
  const createFormButton = await screen.findByText('Create Form');
  fireEvent.click(createFormButton);
  const editFormTab = await screen.findByText('Edit Form');
  expect(Array.from(editFormTab.classList)).contains('active');
});

test('Create a form without a title, name, and path should display validation error', async () => {
  server.use(
    http.post('http://localhost:3002/form', () => {
      return HttpResponse.json({
        'status': 400,
        'message': 'form validation failed: path: Path `path` is required., name: Path `name` is required., title: Path `title` is required.',
        'errors': {
          'path': {
            'path': 'path',
            'name': 'ValidatorError',
            'message': 'Path `path` is required.'
          },
          'name': {
            'path': 'name',
            'name': 'ValidatorError',
            'message': 'Path `name` is required.'
          },
          'title': {
            'path': 'title',
            'name': 'ValidatorError',
            'message': 'Path `title` is required.'
          }
        }
      }, { status: 400 });
    })
  );
  await userEvent.click(await screen.findByText('+ New Form'));
  await userEvent.click(await screen.findByText('Create Form'));
  expect(await screen.findByText('Could not connect to API server (form validation failed: path: Path `path` is required., name: Path `name` is required., title: Path `title` is required.): http://localhost:3002/form'));
});

test('Clicking on Display As Wizard adds a Page 1 panel with a Page 1 button and + Page button', async () => {
  await userEvent.click(await screen.findByText('+ New Form'));
  await screen.findByText('Form Title');
  await waitFor(() => {
    const choicesHandler = (document.querySelector('div.formio-component.formio-component-select.formio-component-display') as HTMLElement & {
      component: { choices: { _handleChoiceAction: (activeItems: DOMStringMap, item: Element) => void } }
    })!.component.choices;
    choicesHandler._handleChoiceAction((document.querySelector('[data-value="wizard"]')! as HTMLElement & {
      dataset: DOMStringMap
    }).dataset, document.querySelector('[data-value="wizard"]')!);
  });
  const page1Text = await screen.findAllByText('Page 1');
  expect(Array.from(page1Text).length).to.equal(2);
  await waitFor(() => {
    const createPageButton = document.querySelector('span[ref="addPage"]');
    expect(createPageButton).to.exist;
  });
});

test('Display as PDF should not exist', async () => {
  const newFormButton = await screen.findByText('+ New Form');
  await userEvent.click(newFormButton);
  expect(await screen.findByText('New Form'));
  expect(screen.queryByText('PDF')).to.be.null;
});

afterEach(() => {
  server.resetHandlers();
  Formio.clearCache();
  Formio.tokens = {};
  localStorage.clear();
  window.location.href = '';
});

afterAll(() => {
  server.close();
});
