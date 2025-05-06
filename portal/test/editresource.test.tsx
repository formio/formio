import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Formio } from '@formio/js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormioProvider } from '@formio/react';
import { userEvent } from '@testing-library/user-event';
import { InfoPanelProvider } from '../src/hooks/useInfoPanelContext';
import App from '../src/components/App';

const server = setupServer(
  http.get('http://localhost:3002/current', () => {
    return HttpResponse.json({});
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

test('Clicking on edit button under resources form list takes you to edit resource page', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('type') === 'resource') {
        return HttpResponse.json([
          {
            '_id': '679d116aa90ca7ccebc38597',
            'title': 'test',
            'name': 'test',
            'path': 'test',
            'type': 'resource',
            'display': 'form'
          }
        ]);
      } else {
        return HttpResponse.json([]);
      }
    }),
    http.get('/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json({
        '_id': '679d116aa90ca7ccebc38597',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form'
      });
    })
  );
  const editButton: HTMLAnchorElement = await screen.findByText('Edit');
  editButton.click();
  expect(await screen.findByText('Form Title'));
  expect(await screen.findByText('Form Name'));
  expect(await screen.findByText('test'));
});

test('Clicking save resource updates the resource', async () => {
  const resourceForms = [
    {
      '_id': '679d116aa90ca7ccebc38597',
      'title': 'test',
      'name': 'test',
      'path': 'test',
      'type': 'resource',
      'display': 'form'
    }
  ];
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('type') === 'resource') {
        return HttpResponse.json(resourceForms);
      } else {
        return HttpResponse.json([]);
      }
    }),
    http.get('/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json(resourceForms[0]);
    }),
    http.put('http://localhost:3002/form/679d116aa90ca7ccebc38597', () => {
      resourceForms[0].title = 'tests';
      resourceForms[0].name = 'tests';
      resourceForms[0].path = 'tests';
      return HttpResponse.json({
        'title': 'tests',
        'name': 'tests',
        'path': 'tests',
        'type': 'resource',
        'display': 'form'
      });
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await screen.findByText('Form Title');
  await screen.findByText('Form Name');
  await userEvent.type(document.querySelector('[name="data[title]"]')!, 's');
  await waitFor(() => {
    expect((document.querySelector('[name="data[name]"]')! as HTMLInputElement).value).to.equal('tests');
  });
  fireEvent.click(await screen.findByText('Save Resource'));
  await waitFor(() => {
    expect(document.querySelector('div.panel-wrap.main.resource')!.querySelector('div.panel-title')!.textContent).to.equal(' tests');
  });
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
