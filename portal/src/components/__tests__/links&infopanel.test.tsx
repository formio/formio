import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FormioProvider } from '@formio/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Formio } from '@formio/js';

import { InfoPanelProvider } from '../../hooks/useInfoPanelContext';
import App from '../App';

const server = setupServer(
  http.get('http://localhost:3002/admin/login', () => {
    return HttpResponse.json({});
  }),
  http.get('http://localhost:3002/form', () => {
    return HttpResponse.json([]);
  }),
  http.get('http://localhost:3002/current', () => {
    return HttpResponse.json({});
  })
);

beforeAll(() => {
  server.listen();
});

beforeEach(() => {
  localStorage.clear();
  Formio.tokens = {};
  server.resetHandlers();
});

test('Link to help documentation should be in the login page', async () => {
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  const helpDocumentationLink: HTMLAnchorElement = await screen.findByText('Form.io Help Documentation');
  expect(helpDocumentationLink).to.exist;
  expect(helpDocumentationLink.href).to.equal('https://help.form.io/');
});

test('Link to renderer documentation should be in the login page', async () => {
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  const rendererDocumentationLink: HTMLAnchorElement = await screen.findByText('Form.io SDK / Renderer Documentation');
  expect(rendererDocumentationLink).to.exist;
  expect(rendererDocumentationLink.href).to.equal('https://help.form.io/developers/javascript-development/javascript-sdk');
});

test('Links to contact us should be on the home page', async () => {
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  const contactUsLinks: HTMLAnchorElement[] = await screen.findAllByText('contact us');
  expect(contactUsLinks.length).to.equal(2);
  expect(contactUsLinks[0].href).to.equal('https://form.io/contact');
  expect(contactUsLinks[1].href).to.equal('https://form.io/contact');
});

test('Resources help icon documentation should exists, have a link to resources documentation, and clicking on resource help icon should open up help documentation', async () => {
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await waitFor(() => {
    const resourceHelpButton: HTMLButtonElement = document.querySelector('div.panel-wrap.resources')!.querySelector('button.help')!;
    expect(resourceHelpButton).to.exist;
    resourceHelpButton.click();
    expect(Array.from(resourceHelpButton.classList)).contains('active');
    expect(document.querySelector('div.panel-wrap.resources')!.querySelector('div.help-bubble.active')).to.exist;
  });
  expect(await screen.findByText('Resources are the objects within your Project. Examples: User, Company, Vehicle, etc.', { exact: false }));
  const resourcesLink: HTMLElement = (await screen.findAllByText('View documentation'))[0];
  if (resourcesLink instanceof HTMLAnchorElement) {
    expect(resourcesLink.href).to.equal('https://help.form.io/userguide/resources');
  } else {
    throw Error('resourcesLink is not an anchor element');
  }
});

test('Forms help icon documentation should exists, have a link to resources documentation, and clicking on forms help icon should open up help documentation', async () => {
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await waitFor(() => {
    const formsHelpButton: HTMLButtonElement = document.querySelector('div.panel-wrap.forms')!.querySelector('button.help')!;
    expect(formsHelpButton).to.exist;
    formsHelpButton.click();
    expect(Array.from(formsHelpButton.classList)).contains('active');
    expect(document.querySelector('div.panel-wrap.forms')!.querySelector('div.help-bubble.active')).to.exist;
  });
  expect(await screen.findByText('Forms are the primary interface within the Form.io system.', { exact: false }));
  const formsLink: HTMLElement = (await screen.findAllByText('View documentation'))[1];
  if (formsLink instanceof HTMLAnchorElement) {
    expect(formsLink.href).to.equal('https://help.form.io/userguide/forms');
  } else {
    throw Error('formsLink is not an anchor element');
  }
});


afterAll(() => {
  server.close();
});
