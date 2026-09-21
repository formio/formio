[![Join the chat at https://gitter.im/formio/formio](https://badges.gitter.im/formio/formio.svg)](https://gitter.im/formio/formio?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![StackOverflow](https://img.shields.io/badge/stackoverflow-formio-orange)](http://stackoverflow.com/tags/formio)

# A combined form and API platform for Serverless applications

Form.io is a revolutionary combined Form and API platform for Serverless applications. This repository serves as the core Form and API engine for https://form.io. This system allows you to build "serverless" data management applications using a simple drag-and-drop form builder interface. These forms can then easily be embedded within your Angular.js and React applications using the
`<formio>` HTML element.

## Official Documentation

For the latest documentation, release information, and guides, always refer to the official Form.io Help Documentation available here:

**[https://help.form.io](https://help.form.io/deploy/enterprise-server)**

## Walkthrough video and tutorial

For a walkthrough tutorial on how to use this Open Source platform to build a Serverless application, watch the video [0 to M.E.A.N in 30 minutes](https://www.youtube.com/watch?v=d2gTYkPFhPI)

## Form Building & Rendering Demo

Here is a link to a demo of the Form Building and Form Rendering capability that can be hooked into this API platform.

http://codepen.io/travist/full/xVyMjo/

## Easypanel

If you'd rather not manage the containers yourself, [Easypanel](https://easypanel.io) is a self-hosted deployment platform with a one-click Form.io template:

[![Deploy on Easypanel][easypanel-btn]][easypanel-deploy]

[easypanel-btn]: https://easypanel.io/img/deploy-on-easypanel-40.svg
[easypanel-deploy]: https://easypanel.io/templates/formio

## Run with Docker Compose

The fastest way to run this library locally is to use [Docker](https://docker.com).

- [Install Docker](https://docs.docker.com/engine/install/)
- Download and unzip this package to a local directory on your machine.
- Open up your terminal and navigate to the unzipped folder of this library.
- Type the following in your terminal

  ```
  docker-compose up -d
  ```

  Or, if you have an older version of the Docker image on your machine

  ```bash
  docker-compose up -d --build
  ```

- Go to the following URL in your browser.
  ```
  http://localhost:3001
  ```
- Use the following credentials to login.
  - **email**: admin@example.com
  - **password**: CHANGEME
- To change the admin password.
  - Once you login, click on the **Admin** resource
  - Click **View Data**
  - Click on the **admin@example.com** row
  - Click **Edit Submission**
  - Set the password field
  - Click **Save Submission**
  - Logout

- Have fun!

## Manual Installation (Node + MongoDB)

To get started you will first need the following installed on your machine.

- Node.js - https://nodejs.org/en/
- MongoDB - http://docs.mongodb.org/manual/installation/
  - On Mac I recommend using Homebrew `brew install mongodb-community`
  - On Windows, download and install the MSI package @ https://www.mongodb.org/downloads
- You must then make sure you have MongoDB running by typing `mongod` in your terminal.

## Running with Node.js

You can then download this repository, navigate to the folder in your Terminal, and then type the following.

```bash
# install dependencies
yarn
# build the client application
yarn build
# start the server
yarn start
```

This will walk you through the installation process. When it is done, you will have a running Form.io management
application running at the following address in your browser.

```
http://localhost:3001
```

## Development

To start server with auto restart capability for development simply run this command:

```
npm run start:dev
```

## Logging

Form.io uses structured logging built on [Pino](https://getpino.io), living in `src/util/logger`. It provides an application logger and an HTTP request logger.

### Log levels

The log level is set with the `LOG_LEVEL` environment variable (defaults to `info`). Supported values are the standard [Pino levels](https://getpino.io/#/docs/api?id=levels).

### Usage

Import the logger components:

```javascript
// Within this package:
const { logger, httpLogger } = require('./src/util/logger');
// From a downstream package (e.g. formio-server):
const { logger, httpLogger } = require('formio/src/util/logger');
```

### HTTP request logging

The `httpLogger` middleware traces incoming requests and attaches a request-scoped logger as `req.log`:

```javascript
app.use(httpLogger);
```

Mount it before any other middleware but **after** `app.set('query parser', ...)` — Express 4 fixes the query parser on the first `app.use()`. If you mount the `formio` router into your own Express app without `httpLogger`, the router attaches the request logger itself, so `req.log` is always available to handlers.

Request and response records are redacted before they are written: the `x-token`, `x-admin-key`, `x-jwt-token`, `x-remote-token`, `x-file-token`, `authorization` and `cookie` request headers, the re-issued token response headers, and the `token` / `x-jwt-token` / `x-remote-token` query parameters (in `req.query` and in the URL). Errors are serialized as `{ type, message, stack, code }` only. Redaction cannot see a value you interpolate into a message string — log identifiers, not records.

### Module (child) loggers

Create child loggers to tag entries with a module name; each inherits the parent configuration:

```javascript
const startupLogger = logger.child({ module: 'formio:startup' });

startupLogger.info('Initializing Form.io server...');
startupLogger.error(errObject, 'Error description');
```

### Output format

Structured output is behind the `STRUCTURED_LOGGING` feature flag and is **off by default**. Until it is switched on, the server reproduces the pre-migration `debug` stream: text lines on **stderr**, filtered by namespace.

Enable it with the flag's environment variable:

```
FORMIO_STRUCTURED_LOGGING=true
```

With the flag **on**, the logger emits structured JSON on **stdout** (or human-friendly [pino-pretty](https://github.com/pinojs/pino-pretty) output when running in an interactive terminal), and the output mode is resolved in this priority order:

1. `FORMIO_LOG_FORMAT` — set to `json` or `legacy` to force a mode explicitly.
2. `DEBUG` present — when no `FORMIO_LOG_FORMAT` is set but the `DEBUG` environment variable is, legacy mode is selected automatically (zero-config compatibility for existing `DEBUG=formio:*` monitoring).
3. Otherwise — JSON (or pino-pretty in a TTY).

With the flag **off**, legacy is unconditional — `FORMIO_LOG_FORMAT=json` will not override it. The flag is the single switch that decides whether the structured format can appear at all.

Per-request HTTP access logging (the `httpLogger` "request completed" lines) is new with the structured logger and has no `debug` predecessor, so it is likewise silent while the flag is off. The middleware still runs either way — `req.log` is available to handlers regardless.

In legacy mode each record is replayed through the [`debug`](https://github.com/debug-js/debug) package, using its `module` field as the namespace, with the following emission rules:

- `trace` / `debug` — emitted only when the `module` namespace matches the `DEBUG` pattern (the original `debug` behavior, including wildcards and negation).
- `info` — always passes through.
- `warn` / `error` / `fatal` — always emitted, regardless of `DEBUG`, so error visibility is never lost.

Legacy mode is purely an output-transport swap; the logger API (`logger`, `logger.child({ module })`, the level methods, and `httpLogger`) is unchanged.

## Deploy to Hosted Form.io

If you wish to deploy all of your forms and resources into the Form.io Hosted platform @ https://portal.form.io, you can do this by using the Form.io CLI command line tool.

```
npm install -g formio-cli
```

Once you have this tool installed, you will need to follow these steps.

- Create a new project within Form.io
- Create an API Key within this project by going to the **Project Settings | Stage Settings | API Keys**
- Next, you can execute the following command to deploy your local project into Hosted Form.io.

```
formio deploy http://localhost:3001 https://{PROJECTNAME}.form.io --dst-key={APIKEY}
```

You will need to make sure you replace `{PROJECTNAME}` and `{APIKEY}` with your new Hosted Form.io project name (found in the API url), as well as the API key that was created in the second step above.

This will then ask you to log into the local Form.io server (which can be provided within the Admin resource), and then after it authenticates, it will export the project and deploy that project to the Form.io hosted form.

## License Change (March 8th, 2020)

This library is now licensed under the OSL-v3 license, which is a copy-left OSI approved license. Please read the license @ https://opensource.org/licenses/OSL-3.0 for more information. Our goal for the change to OSLv3 from BSD is to ensure that appropriate Attribution is provided when creating proprietary products that leverage or extend this library.

## Help

We will be updating the help guides found @ https://help.form.io as questions arise and also to help you get started with Form.io.

Thanks for using Form.io!

The Form.io Team.

# Security

If you find and/or think you have found a Security issue, please quietly disclose it to security@form.io, and give us
sufficient time to patch the issue before disclosing it publicly.
