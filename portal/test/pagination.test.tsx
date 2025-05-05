import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { FormioProvider } from '@formio/react';
import { Formio } from '@formio/js';
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


test('Clicking on the resources next button should show the next page of resources', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      const skip = url.searchParams.get('skip');
      if (!type || !skip) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'resource') {
        if (skip === '0') {
          return HttpResponse.json([
            {
              title: 'resource1',
              path: 'resource1',
              name: 'resource1',
              type: 'resource',
              _id: '1'
            },
            {
              title: 'resource2',
              path: 'resource2',
              name: 'resource2',
              type: 'resource',
              _id: '2'
            },
            {
              title: 'resource3',
              path: 'resource3',
              name: 'resource3',
              type: 'resource',
              _id: '3'
            },
            {
              title: 'resource4',
              path: 'resource4',
              name: 'resource4',
              type: 'resource',
              _id: '4'
            },
            {
              title: 'resource5',
              path: 'resource5',
              name: 'resource5',
              type: 'resource',
              _id: '5'
            },
            {
              title: 'resource6',
              path: 'resource6',
              name: 'resource6',
              type: 'resource',
              _id: '6'
            },
            {
              title: 'resource7',
              path: 'resource7',
              name: 'resource7',
              type: 'resource',
              _id: '7'
            },
            {
              title: 'resource8',
              path: 'resource8',
              name: 'resource8',
              type: 'resource',
              _id: '8'
            },
            {
              title: 'resource9',
              path: 'resource9',
              name: 'resource9',
              type: 'resource',
              _id: '9'
            },
            {
              title: 'resource10',
              path: 'resource10',
              name: 'resource10',
              type: 'resource',
              _id: '10'
            }
          ], {
            headers: {
              'Content-Range': '0-9/11'
            }
          });
        } else if (skip === '10') {
          return HttpResponse.json([
            {
              title: 'resource11',
              path: 'resource11',
              name: 'resource11',
              type: 'resource',
              _id: '11'
            }
          ]);
        }
        return HttpResponse.json([]);
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  expect(await screen.findByText('resource1'));
  const nextButton = (await screen.findAllByText('Next'))[0];
  await userEvent.click(nextButton);
  expect(await screen.findByText('resource11'));
});

test('Clicking on the resources previous button should show the previous page of resources', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      const skip = url.searchParams.get('skip');
      if (!type || !skip) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'resource') {
        if (skip === '0') {
          return HttpResponse.json([
            {
              title: 'resource1',
              path: 'resource1',
              name: 'resource1',
              type: 'resource',
              _id: '1'
            },
            {
              title: 'resource2',
              path: 'resource2',
              name: 'resource2',
              type: 'resource',
              _id: '2'
            },
            {
              title: 'resource3',
              path: 'resource3',
              name: 'resource3',
              type: 'resource',
              _id: '3'
            },
            {
              title: 'resource4',
              path: 'resource4',
              name: 'resource4',
              type: 'resource',
              _id: '4'
            },
            {
              title: 'resource5',
              path: 'resource5',
              name: 'resource5',
              type: 'resource',
              _id: '5'
            },
            {
              title: 'resource6',
              path: 'resource6',
              name: 'resource6',
              type: 'resource',
              _id: '6'
            },
            {
              title: 'resource7',
              path: 'resource7',
              name: 'resource7',
              type: 'resource',
              _id: '7'
            },
            {
              title: 'resource8',
              path: 'resource8',
              name: 'resource8',
              type: 'resource',
              _id: '8'
            },
            {
              title: 'resource9',
              path: 'resource9',
              name: 'resource9',
              type: 'resource',
              _id: '9'
            },
            {
              title: 'resource10',
              path: 'resource10',
              name: 'resource10',
              type: 'resource',
              _id: '10'
            }
          ], {
            headers: {
              'Content-Range': '0-9/11'
            }
          });
        } else if (skip === '10') {
          return HttpResponse.json([
            {
              title: 'resource11',
              path: 'resource11',
              name: 'resource11',
              type: 'resource',
              _id: '11'
            }
          ]);
        }
        return HttpResponse.json([]);
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  expect(await screen.findByText('resource1'));
  const nextButton = (await screen.findAllByText('Next'))[0];
  await userEvent.click(nextButton);
  expect(await screen.findByText('resource11'));
  expect(screen.queryByText('resource1')).to.be.null;
  const prevButton = (await screen.findAllByText('Prev'))[0];
  await userEvent.click(prevButton);
  expect(await screen.findByText('resource1'));
  expect(screen.queryByText('resource11')).to.be.null;
});

test('Clicking on the forms next button should show the next page of forms', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      const skip = url.searchParams.get('skip');
      if (!type || !skip) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'form') {
        if (skip === '0') {
          return HttpResponse.json([
            {
              title: 'form1',
              path: 'form1',
              name: 'form1',
              type: 'form',
              _id: '1'
            },
            {
              title: 'form2',
              path: 'form2',
              name: 'form2',
              type: 'form',
              _id: '2'
            },
            {
              title: 'form3',
              path: 'form3',
              name: 'form3',
              type: 'form',
              _id: '3'
            },
            {
              title: 'form4',
              path: 'form4',
              name: 'form4',
              type: 'form',
              _id: '4'
            },
            {
              title: 'form5',
              path: 'form5',
              name: 'form5',
              type: 'form',
              _id: '5'
            },
            {
              title: 'form6',
              path: 'form6',
              name: 'form6',
              type: 'form',
              _id: '6'
            },
            {
              title: 'form7',
              path: 'form7',
              name: 'form7',
              type: 'form',
              _id: '7'
            },
            {
              title: 'form8',
              path: 'form8',
              name: 'form8',
              type: 'form',
              _id: '8'
            },
            {
              title: 'form9',
              path: 'form9',
              name: 'form9',
              type: 'form',
              _id: '9'
            },
            {
              title: 'form10',
              path: 'form10',
              name: 'form10',
              type: 'form',
              _id: '10'
            }
          ], {
            headers: {
              'Content-Range': '0-9/11'
            }
          });
        } else if (skip === '10') {
          return HttpResponse.json([
            {
              title: 'form11',
              path: 'form11',
              name: 'form11',
              type: 'form',
              _id: '11'
            }
          ]);
        }
        return HttpResponse.json([]);
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  expect(await screen.findByText('form1'));
  const nextButton = (await screen.findAllByText('Next'))[1];
  await userEvent.click(nextButton);
  expect(await screen.findByText('form11'));
});

test('Clicking on the forms previous button should show the previous page of forms', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      const skip = url.searchParams.get('skip');
      if (!type || !skip) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'form') {
        if (skip === '0') {
          return HttpResponse.json([
            {
              title: 'form1',
              path: 'form1',
              name: 'form1',
              type: 'form',
              _id: '1'
            },
            {
              title: 'form2',
              path: 'form2',
              name: 'form2',
              type: 'form',
              _id: '2'
            },
            {
              title: 'form3',
              path: 'form3',
              name: 'form3',
              type: 'form',
              _id: '3'
            },
            {
              title: 'form4',
              path: 'form4',
              name: 'form4',
              type: 'form',
              _id: '4'
            },
            {
              title: 'form5',
              path: 'form5',
              name: 'form5',
              type: 'form',
              _id: '5'
            },
            {
              title: 'form6',
              path: 'form6',
              name: 'form6',
              type: 'form',
              _id: '6'
            },
            {
              title: 'form7',
              path: 'form7',
              name: 'form7',
              type: 'form',
              _id: '7'
            },
            {
              title: 'form8',
              path: 'form8',
              name: 'form8',
              type: 'form',
              _id: '8'
            },
            {
              title: 'form9',
              path: 'form9',
              name: 'form9',
              type: 'form',
              _id: '9'
            },
            {
              title: 'form10',
              path: 'form10',
              name: 'form10',
              type: 'form',
              _id: '10'
            }
          ], {
            headers: {
              'Content-Range': '0-9/11'
            }
          });
        } else if (skip === '10') {
          return HttpResponse.json([
            {
              title: 'form11',
              path: 'form11',
              name: 'form11',
              type: 'form',
              _id: '11'
            }
          ]);
        }
        return HttpResponse.json([]);
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  expect(await screen.findByText('form1'));
  const nextButton = (await screen.findAllByText('Next'))[1];
  await userEvent.click(nextButton);
  expect(await screen.findByText('form11'));
  expect(screen.queryByText('form1')).to.be.null;
  const prevButton = (await screen.findAllByText('Prev'))[1];
  await userEvent.click(prevButton);
  expect(await screen.findByText('form1'));
  expect(screen.queryByText('form11')).to.be.null;
});

test('Resources next button should be disabled if there are not enough resource forms', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      if (!type) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'resource') {
        return HttpResponse.json([
          {
            title: 'resource1',
            path: 'resource1',
            name: 'resource1',
            type: 'resource',
            _id: '1'
          },
          {
            title: 'resource2',
            path: 'resource2',
            name: 'resource2',
            type: 'resource',
            _id: '2'
          },
          {
            title: 'resource3',
            path: 'resource3',
            name: 'resource3',
            type: 'resource',
            _id: '3'
          },
          {
            title: 'resource4',
            path: 'resource4',
            name: 'resource4',
            type: 'resource',
            _id: '4'
          },
          {
            title: 'resource5',
            path: 'resource5',
            name: 'resource5',
            type: 'resource',
            _id: '5'
          },
          {
            title: 'resource6',
            path: 'resource6',
            name: 'resource6',
            type: 'resource',
            _id: '6'
          },
          {
            title: 'resource7',
            path: 'resource7',
            name: 'resource7',
            type: 'resource',
            _id: '7'
          },
          {
            title: 'resource8',
            path: 'resource8',
            name: 'resource8',
            type: 'resource',
            _id: '8'
          },
          {
            title: 'resource9',
            path: 'resource9',
            name: 'resource9',
            type: 'resource',
            _id: '9'
          }
        ], {
          headers: {
            'Content-Range': '0-9/9'
          }
        });
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  const nextButton = (await screen.findAllByText('Next'))[0];
  expect(Array.from(nextButton.classList)).contains('disabled');
});

test('Resources prev button should be disabled if there are no resources to go back to', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      if (!type) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'resource') {
        return HttpResponse.json([
          {
            title: 'resource1',
            path: 'resource1',
            name: 'resource1',
            type: 'resource',
            _id: '1'
          },
          {
            title: 'resource2',
            path: 'resource2',
            name: 'resource2',
            type: 'resource',
            _id: '2'
          },
          {
            title: 'resource3',
            path: 'resource3',
            name: 'resource3',
            type: 'resource',
            _id: '3'
          },
          {
            title: 'resource4',
            path: 'resource4',
            name: 'resource4',
            type: 'resource',
            _id: '4'
          },
          {
            title: 'resource5',
            path: 'resource5',
            name: 'resource5',
            type: 'resource',
            _id: '5'
          },
          {
            title: 'resource6',
            path: 'resource6',
            name: 'resource6',
            type: 'resource',
            _id: '6'
          },
          {
            title: 'resource7',
            path: 'resource7',
            name: 'resource7',
            type: 'resource',
            _id: '7'
          },
          {
            title: 'resource8',
            path: 'resource8',
            name: 'resource8',
            type: 'resource',
            _id: '8'
          },
          {
            title: 'resource9',
            path: 'resource9',
            name: 'resource9',
            type: 'resource',
            _id: '9'
          }
        ], {
          headers: {
            'Content-Range': '0-9/9'
          }
        });
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  const prevButton = (await screen.findAllByText('Prev'))[0];
  expect(Array.from(prevButton.classList)).contains('disabled');
});

test('Forms next button should be disabled if there are no forms to go back to', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      if (!type) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'form') {
        return HttpResponse.json([
          {
            title: 'form1',
            path: 'form1',
            name: 'form1',
            type: 'form',
            _id: '1'
          },
          {
            title: 'form2',
            path: 'form2',
            name: 'form2',
            type: 'form',
            _id: '2'
          },
          {
            title: 'form3',
            path: 'form3',
            name: 'form3',
            type: 'form',
            _id: '3'
          },
          {
            title: 'form4',
            path: 'form4',
            name: 'form4',
            type: 'form',
            _id: '4'
          },
          {
            title: 'form5',
            path: 'form5',
            name: 'form5',
            type: 'form',
            _id: '5'
          },
          {
            title: 'form6',
            path: 'form6',
            name: 'form6',
            type: 'form',
            _id: '6'
          },
          {
            title: 'form7',
            path: 'form7',
            name: 'form7',
            type: 'form',
            _id: '7'
          },
          {
            title: 'form8',
            path: 'form8',
            name: 'form8',
            type: 'form',
            _id: '8'
          },
          {
            title: 'form9',
            path: 'form9',
            name: 'form9',
            type: 'form',
            _id: '9'
          }
        ], {
          headers: {
            'Content-Range': '0-9/9'
          }
        });
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  const nextButton = (await screen.findAllByText('Next'))[1];
  expect(Array.from(nextButton.classList)).contains('disabled');
});

test('Forms prev button should be disabled if there are no forms to go back to', async () => {
  server.use(
    http.get('http://localhost:3002/form', ({ request }) => {
      const url = new URL(request.url);

      const type = url.searchParams.get('type');
      if (!type) {
        return new HttpResponse(null, { status: 404 });
      }
      if (type === 'form') {
        return HttpResponse.json([
          {
            title: 'form1',
            path: 'form1',
            name: 'form1',
            type: 'form',
            _id: '1'
          },
          {
            title: 'form2',
            path: 'form2',
            name: 'form2',
            type: 'form',
            _id: '2'
          },
          {
            title: 'form3',
            path: 'form3',
            name: 'form3',
            type: 'form',
            _id: '3'
          },
          {
            title: 'form4',
            path: 'form4',
            name: 'form4',
            type: 'form',
            _id: '4'
          },
          {
            title: 'form5',
            path: 'form5',
            name: 'form5',
            type: 'form',
            _id: '5'
          },
          {
            title: 'form6',
            path: 'form6',
            name: 'form6',
            type: 'form',
            _id: '6'
          },
          {
            title: 'form7',
            path: 'form7',
            name: 'form7',
            type: 'form',
            _id: '7'
          },
          {
            title: 'form8',
            path: 'form8',
            name: 'form8',
            type: 'form',
            _id: '8'
          },
          {
            title: 'form9',
            path: 'form9',
            name: 'form9',
            type: 'form',
            _id: '9'
          }
        ], {
          headers: {
            'Content-Range': '0-9/9'
          }
        });
      } else {
        return HttpResponse.json([]);
      }
    })
  );
  const prevButton = (await screen.findAllByText('Prev'))[1];
  expect(Array.from(prevButton.classList)).contains('disabled');
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
