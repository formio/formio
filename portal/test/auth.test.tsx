import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormioProvider } from '@formio/react';
import { userEvent } from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Formio } from '@formio/js';
import { act } from 'react';
import App from '../src/components/App';
import { InfoPanelProvider } from '../src/hooks/useInfoPanelContext';

const server = setupServer(
  http.get('http://localhost:3002/form', () => {
    return HttpResponse.json([]);
  }),
  http.get('http://localhost:3002/logout', () => {
    return HttpResponse.text('OK', { status: 200 });
  }),
  http.get('http://localhost:3002/admin/login', () => {
    return HttpResponse.json({
      'components': [
        {
          'type': 'email',
          'persistent': true,
          'unique': false,
          'protected': false,
          'defaultValue': '',
          'suffix': '',
          'prefix': '',
          'placeholder': 'Enter your email address',
          'key': 'email',
          'lockKey': true,
          'label': 'Email',
          'inputType': 'email',
          'tableView': true,
          'input': true
        },
        {
          'type': 'password',
          'persistent': true,
          'protected': true,
          'suffix': '',
          'prefix': '',
          'placeholder': 'Enter your password.',
          'key': 'password',
          'lockKey': true,
          'label': 'Password',
          'inputType': 'password',
          'tableView': false,
          'input': true
        },
        {
          'type': 'button',
          'theme': 'primary',
          'disableOnInvalid': true,
          'action': 'submit',
          'block': false,
          'rightIcon': '',
          'leftIcon': '',
          'size': 'md',
          'key': 'submit',
          'tableView': false,
          'label': 'Submit',
          'input': true
        }
      ]
    });
  }),
  http.get('http://localhost:3002/current', () => {
    return HttpResponse.json({});
  })
);

beforeAll(() => {
  server.listen();
});

test('Should be on login page if the user is not authenticated', async () => {
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  expect(await screen.findByText('Email'));
  expect(await screen.findByText('Password'));
});

test('Navigate to the home page if the user is already authenticated', async () => {
  localStorage.setItem('formioToken', '12345');
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  expect(await screen.findByText('Resources'));
  expect(await screen.findByText('Forms'));
});

test('Clicking on the submit button should navigate you to the home page if login was successful', async () => {
  server.use(http.post('http://localhost:3002/admin/login/submission', () => {
    return HttpResponse.json({}, {
      headers: {
        'x-jwt-token': 'test123'
      }
    });
  }));
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  const submitButton = await screen.findByText('Submit');
  await userEvent.click(submitButton);
  expect(await screen.findByText('Forms'));
  expect(await screen.findByText('Resources'));
});

test('Clicking the logout button should navigate you back to the home page and remove user from local storage', async () => {
  render(
    <FormioProvider baseUrl="http://localhost:3002">
      <InfoPanelProvider>
        <App />
      </InfoPanelProvider>
    </FormioProvider>
  );
  localStorage.setItem('formioUser', JSON.stringify({}));
  act(() => {
    Formio.events.emit('formio.user', {});
  });
  const logoutButton = await screen.findByText('Logout');
  await userEvent.click(logoutButton);

  expect(await screen.findByText('Email'));
  expect(await screen.findByText('Password'));
  expect(localStorage.getItem('formioUser')).to.be.null;
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
