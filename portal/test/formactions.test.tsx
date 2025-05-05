import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { FormioProvider } from '@formio/react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Formio } from '@formio/js';
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

test('Clicking on Form Actions tab takes you to /actions page', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('type') === 'form') {
        return HttpResponse.json([
          {
            _id: '679d387ba90ca7ccebc387a1',
            name: 'test',
            title: 'test',
            path: 'test',
            type: 'form',
            display: 'form'
          }
        ]);
      } else {
        return HttpResponse.json([]);
      }
    }),
    http.get('http://localhost:3002/form/679d387ba90ca7ccebc387a1', () => {
      return HttpResponse.json({
        _id: '679d387ba90ca7ccebc387a1',
        name: 'test',
        title: 'test',
        path: 'test',
        type: 'form',
        display: 'form'
      });
    }),
    http.get('/form/679d387ba90ca7ccebc387a1', () => {
      return HttpResponse.json({
        _id: '679d387ba90ca7ccebc387a1',
        name: 'test',
        title: 'test',
        path: 'test',
        type: 'form',
        display: 'form'
      });
    }),
    http.get('http://localhost:3002/form/679d387ba90ca7ccebc387a1/action', () => {
      return HttpResponse.json([]);
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await userEvent.click(await screen.findByText('Form Actions'));
  expect(await screen.findByText('Name'));
  expect(await screen.findByText('Operations'));
  expect(await screen.findByText('Add Action', { exact: false }));
  expect(window.location.href).to.include('/actions');
});

test('A request to /action on the actions page will load the actions on the page', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('type') === 'form') {
        return HttpResponse.json([
          {
            _id: '679d387ba90ca7ccebc387a1',
            name: 'test',
            title: 'test',
            path: 'test',
            type: 'form',
            display: 'form'
          }
        ]);
      } else {
        return HttpResponse.json([]);
      }
    }),
    http.get('http://localhost:3002/form/679d387ba90ca7ccebc387a1', () => {
      return HttpResponse.json({
        _id: '679d387ba90ca7ccebc387a1',
        name: 'test',
        title: 'test',
        path: 'test',
        type: 'form',
        display: 'form'
      });
    }),
    http.get('/form/679d387ba90ca7ccebc387a1', () => {
      return HttpResponse.json({
        _id: '679d387ba90ca7ccebc387a1',
        name: 'test',
        title: 'test',
        path: 'test',
        type: 'form',
        display: 'form'
      });
    }),
    http.get('http://localhost:3002/form/679d387ba90ca7ccebc387a1/action', () => {
      return HttpResponse.json([
        {
          '_id': '679d387ba90ca7ccebc387a9',
          'title': 'Save Submission',
          'name': 'save',
          'form': '679d387ba90ca7ccebc387a1'
        }
      ]);
    })
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await userEvent.click(await screen.findByText('Form Actions'));
  await screen.findByText('Add Action', { exact: false });
  expect(await screen.findByText('Save Submission'));
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
