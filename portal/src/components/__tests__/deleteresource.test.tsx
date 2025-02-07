import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { setupServer } from 'msw/node';
import { Formio } from '@formio/js';
import { render, screen, waitFor } from '@testing-library/react';
import { FormioProvider } from '@formio/react';
import { http, HttpResponse } from 'msw';
import { InfoPanelProvider } from '../../hooks/useInfoPanelContext';
import App from '../App';

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

test('Clicking on delete resource removes the resource from the page', async () => {
  const originalWindowConfirm = window.confirm;
  window.confirm = () => true;
  const resourceForms = [
    {
      '_id': '679cfb424554d6489e37cd15',
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
    http.delete('http://localhost:3002/form/679cfb424554d6489e37cd15', () => {
      resourceForms.splice(0, 1);
      return HttpResponse.text(null, { status: 200 });
    })
  )
  ;
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await screen.findByText('test');
  await waitFor(() => {
    const trashButton: HTMLAnchorElement = document.querySelector('a.btn.trash')!;
    expect(trashButton).to.not.be.null;
    trashButton.click();
  });
  await waitFor(() => {
    expect(screen.queryByText('test')).to.be.null;
  });
  window.confirm = originalWindowConfirm;
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
