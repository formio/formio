import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FormioProvider } from '@formio/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Formio } from '@formio/js';
import { userEvent } from '@testing-library/user-event';
import { InfoPanelProvider } from '../src/hooks/useInfoPanelContext';
import App from '../src/components/App';

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

test('Home screen info panel isn\'t visible when first logging in and is visible when clicked', async () => {
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  expect(Array.from(document.body.classList)).to.contain('context-toggled');

  await userEvent.click(await screen.findByText('Info Panel', { exact: false }));

  expect(Array.from(document.body.classList)).to.be.empty;

});

test('The info panel in /newresource page should display creating resources info panel and have correct links', async () => {
  server.use(
    http.get('http://localhost:3002/form', () => {
      return HttpResponse.json([]);
    })
  );
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await screen.findByText('Forms');
  await screen.findByText('Resources');
  await userEvent.click(await screen.findByText('+ New Resource'));
  await waitFor(() => {
    expect(document.querySelector('div.context-header')!.textContent).to.equal('Creating Resources');
  });
  const seeFormBuildingDocumentationLink: HTMLAnchorElement = await screen.findByText('See Form Building Documentation');
  expect(seeFormBuildingDocumentationLink.href).to.equal('https://help.form.io/userguide/form-building');
  const viewDocumentationLink: HTMLAnchorElement = await screen.findByText('View Documentation');
  expect(viewDocumentationLink.href).to.equal('https://help.form.io/userguide/forms/form-revisions');
  const configurationLink: HTMLAnchorElement = await screen.findByText('configuration');
  expect(configurationLink.href).to.equal('https://form.io/pricing');
  const contactUsLink: HTMLAnchorElement = await screen.findByText('Contact Us');
  expect(contactUsLink.href).to.equal('https://form.io/contact-us/');
});

test('The info panel in /newform page should display creating forms info panel and have correct links', async () => {
  server.use(
    http.get('http://localhost:3002/form', () => {
      return HttpResponse.json([]);
    })
  );
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await screen.findByText('Forms');
  await screen.findByText('Resources');
  await userEvent.click(await screen.findByText('+ New Form'));
  await waitFor(() => {
    expect(document.querySelector('div.context-header')!.textContent).to.equal('Creating Forms');
  });
  const seeFormBuildingDocumentationLink: HTMLAnchorElement = await screen.findByText('See Form Building Documentation');
  expect(seeFormBuildingDocumentationLink.href).to.equal('https://help.form.io/userguide/form-building');
  const viewDocumentationLink: HTMLAnchorElement = await screen.findByText('View Documentation');
  expect(viewDocumentationLink.href).to.equal('https://help.form.io/userguide/forms/form-revisions');
  const configurationLink: HTMLAnchorElement = await screen.findByText('configuration');
  expect(configurationLink.href).to.equal('https://form.io/pricing');
  const contactUsLink: HTMLAnchorElement = await screen.findByText('Contact Us');
  expect(contactUsLink.href).to.equal('https://form.io/contact-us/');
});

test('The info panel in /form/:id page should display editing forms info panel and have correct links', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('type') === 'form') {
        return HttpResponse.json([
          {
            '_id': '679bc82961e9293dee60f88a',
            'title': 'test',
            'name': 'test',
            'path': 'test',
            'type': 'form',
            'display': 'form'
          }
        ]);
      } else {
        return HttpResponse.json([]);
      }
    }),
    http.get('/form/679bc82961e9293dee60f88a', () => {
      return HttpResponse.json({
        '_id': '679bc82961e9293dee60f88a',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'form',
        'display': 'form'
      });
    })
  );
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await screen.findByText('Forms');
  await screen.findByText('Resources');
  await userEvent.click(await screen.findByText('test'));
  await waitFor(() => {
    expect(document.querySelector('div.context-header')!.textContent?.trim()).to.equal('Self-Hosting With Form.io Enterprise');
  });
  const viewDocumentationLink: HTMLAnchorElement = await screen.findByText('View Documentation');
  expect(viewDocumentationLink.href).to.equal('https://help.form.io/userguide/forms/form-revisions');
  const configurationLink: HTMLAnchorElement = await screen.findByText('configuration');
  expect(configurationLink.href).to.equal('https://form.io/pricing');
  const contactUsLink: HTMLAnchorElement = await screen.findByText('Contact Us');
  expect(contactUsLink.href).to.equal('https://form.io/contact-us/');
});

// TODO: Remove the skip when https://formio.atlassian.net/browse/FIO-10107 is fixed
test.skip('The info panel in /resource:id page should display editing resources info panel and have correct links', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const queryParameters = new URL(request.url).searchParams;
      if (queryParameters.get('type') === 'resource') {
        return HttpResponse.json([
          {
            '_id': '679bc82961e9293dee60f88a',
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
    http.get('/form/679bc82961e9293dee60f88a', () => {
      return HttpResponse.json({
        '_id': '679bc82961e9293dee60f88a',
        'title': 'test',
        'name': 'test',
        'path': 'test',
        'type': 'resource',
        'display': 'form'
      });
    })
  );
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await screen.findByText('Forms');
  await screen.findByText('Resources');
  await userEvent.click(await screen.findByText('test'));
  await waitFor(() => {
    expect(document.querySelector('div.context-header')!.textContent).to.equal('Self-Hosting With Form.io Enterprise');
  });
  const viewDocumentationLink: HTMLAnchorElement = await screen.findByText('View Documentation');
  expect(viewDocumentationLink.href).to.equal('https://help.form.io/userguide/forms/form-revisions');
  const configurationLink: HTMLAnchorElement = await screen.findByText('configuration');
  expect(configurationLink.href).to.equal('https://form.io/pricing');
  const contactUsLink: HTMLAnchorElement = await screen.findByText('Contact Us');
  expect(contactUsLink.href).to.equal('https://form.io/contact-us/');
});

test('The view documentation link in actions tab is displayed and href is correct', async () => {
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
      }
      return HttpResponse.json([]);
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
        'display': 'form'
      });
    }),
    http.get('http://localhost:3002/form/679d116aa90ca7ccebc38597/action', () => {
      return HttpResponse.json([]);
    })
  );
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  await screen.findByText('Resources');
  await screen.findByText('Forms');
  await userEvent.click(await screen.findByText('test'));
  await userEvent.click(await screen.findByText('Resource Actions'));
  await waitFor(() => {
    const viewDocumentationLink: HTMLAnchorElement = document.querySelector('.helptext > a')!;
    expect(viewDocumentationLink.textContent).to.equal('View documentation');
    expect(viewDocumentationLink.href).to.equal('https://help.form.io/userguide/form-building/actions');
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
