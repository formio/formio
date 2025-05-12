import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Formio } from '@formio/js';
import { render, screen, waitFor } from '@testing-library/react';
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

test('Clicking the enter data tab takes you to /use page and loads the form', async () => {
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
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json({
        '_id': '679d116aa90ca7ccebc38597',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form',
        'components': [
          {
            type: 'textfield'
          }
        ]
      });
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await screen.findByText('Form Title');
  await screen.findByText('Form Name');
  const enterDataTab = await screen.findByText('Enter Data');
  await userEvent.click(enterDataTab);
  expect(Array.from(enterDataTab.classList)).contains('active');
  expect(window.location.href).to.include('/use');
  expect(await screen.findByText('Text Field'));
});

test('Making a submission takes you to view data page', async () => {
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
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json({
        '_id': '679d116aa90ca7ccebc38597',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form',
        'components': [
          {
            type: 'textfield'
          },
          {
            type: 'button',
            label: 'Submit'
          }
        ]
      });
    }),
    http.post('http://localhost:3002/form/679d116aa90ca7ccebc38597/submission', () => {
      return HttpResponse.json({});
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597/submission', () => {
      return HttpResponse.json([]);
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await screen.findByText('Form Title');
  await screen.findByText('Form Name');
  const enterDataTab = await screen.findByText('Enter Data');
  await userEvent.click(enterDataTab);
  await userEvent.click(await screen.findByText('Submit'));
  await waitFor(() => {
    expect(document.querySelector('button.menu-item.enter-data.active')!.textContent).to.equal('View Data');
    expect(window.location.href).to.include('/view');
  });
});

test('Clicking on view data loads submissions', async () => {
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
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json({
        '_id': '679d116aa90ca7ccebc38597',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form',
        'components': [
          {
            type: 'textfield',
            key: 'textField',
            label: 'Text Field'
          }
        ]
      });
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597/submission', () => {
      return HttpResponse.json([
        {
          data: {
            textField: 'test1'
          }
        },
        {
          data: {
            textField: 'test2'
          }
        }
      ]);
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await screen.findByText('Form Title');
  await screen.findByText('Form Name');
  const viewDataTab = await screen.findByText('View Data');
  await userEvent.click(viewDataTab);
  expect(Array.from(viewDataTab.classList)).contains('active');
  expect(window.location.href).to.include('/view');
  expect(await screen.findByText('Text Field'));
  expect(await screen.findByText('test1'));
  expect(await screen.findByText('test2'));
});

test('Clicking on Export JSON makes a request to /form/:formID/export?format=json', async () => {
  let exportJSONClicked = false;
  URL.createObjectURL = vi.fn();
  URL.revokeObjectURL = vi.fn();
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
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json({
        '_id': '679d116aa90ca7ccebc38597',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form',
        'components': [
          {
            type: 'textfield',
            key: 'textField',
            label: 'Text Field'
          }
        ]
      });
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597/submission', () => {
      return HttpResponse.json([
        {
          data: {
            textField: 'test1'
          }
        },
        {
          data: {
            textField: 'test2'
          }
        }
      ]);
    }),
    http.get('/form/679d116aa90ca7ccebc38597/export', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('format') === 'json') {
        exportJSONClicked = true;
        return HttpResponse.json([]);
      }
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await screen.findByText('Form Title');
  await screen.findByText('Form Name');
  const viewDataTab = await screen.findByText('View Data');
  await userEvent.click(viewDataTab);
  await userEvent.click(await screen.findByText('Export JSON'));
  await waitFor(() => {
    expect(exportJSONClicked).to.be.true;
  });
});

test('Clicking on Export CSV makes a request to /form/:formID/export?format=csv', async () => {
  let exportCSVClicked = false;
  URL.createObjectURL = vi.fn();
  URL.revokeObjectURL = vi.fn();
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
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597', () => {
      return HttpResponse.json({
        '_id': '679d116aa90ca7ccebc38597',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form',
        'components': [
          {
            type: 'textfield',
            key: 'textField',
            label: 'Text Field'
          }
        ]
      });
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597/submission', () => {
      return HttpResponse.json([
        {
          data: {
            textField: 'test1'
          }
        },
        {
          data: {
            textField: 'test2'
          }
        }
      ]);
    }),
    http.get('/form/679d116aa90ca7ccebc38597/export', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('format') === 'csv') {
        exportCSVClicked = true;
        return HttpResponse.json([]);
      }
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await screen.findByText('Form Title');
  await screen.findByText('Form Name');
  const viewDataTab = await screen.findByText('View Data');
  await userEvent.click(viewDataTab);
  await userEvent.click(await screen.findByText('Export CSV'));
  await waitFor(() => {
    expect(exportCSVClicked).to.be.true;
  });
})

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
