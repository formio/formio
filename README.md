[![Join the chat at https://gitter.im/formio/formio](https://badges.gitter.im/formio/formio.svg)](https://gitter.im/formio/formio?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Form.io Community Edition
================================
Form.io is a revolutionary combined Form and API platform for progressive applications. This repository serves as the core Form and API engine for https://form.io. This system allows you to build data-driven, form-based applications using a simple drag-and-drop form builder interface. These forms can then easily be embedded within your Angular.js and React applications using the
```<formio>``` HTML element.

Form Building & Rendering Demo
-------------------
Here is a link to a demo of the Form Building and Form Rendering capability that can be hooked into this API platform.

[https://formio.github.io/formio.js/app/builder.html](https://formio.github.io/formio.js/app/builder.html)

Run with Docker Compose
------------------
The fastest way to run this library locally is to use [Docker](https://docker.com).

 - [Install Docker](https://docs.docker.com/engine/install/)
 - Download and unzip this package to a local directory on your machine.
 - Open up your terminal and navigate to the unzipped folder of this library.
 - Type the following in your terminal
    ```
    docker compose up -d
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

Manual Installation (Node + MongoDB)
-------------------
To get started you will first need the following installed on your machine.

  - Node.js - https://nodejs.org/en/
  - MongoDB - http://docs.mongodb.org/manual/installation/
    - On Mac I recommend using Homebrew `brew install mongodb-community`
    - On Windows, download and install the MSI package @ https://www.mongodb.org/downloads
  - You must then make sure you have MongoDB running by typing `mongod` in your terminal.

Running with Node.js
-------------------
You can then download this repository, navigate to the folder in your Terminal, and then type the following.

```bash
# install dependencies
yarn
# build the client application
yarn build:portal
# start the server
yarn start
```

This will walk you through the installation process.  When it is done, you will have a running Form.io management
application running at the following address in your browser.

```
http://localhost:3001
```

Development
--------------------
To start server with auto restart capability for development simply run this command:
```
npm run start:dev
```

Deploy to Hosted Form.io
--------------------
If you wish to deploy all of your forms and resources into the Form.io Hosted platform @ https://portal.form.io or Form.io Self-Hosted platform, you can do this by using the Form.io CLI command line tool.

```
npm install -g formio-cli
```

Once you have this tool installed, you will need to follow these steps.
 - Create a new project within Form.io
 - Create an API Key within this project by going to the **Project Settings | Stage Settings | API Keys**
 - Next, you can execute the following command to deploy your local project into Hosted Form.io.

```
formio deploy http://localhost:3001 https://{PROJECTNAME}.form.io --src-key {srcAPIKEY} --dst-key {dstAPIKEY}
```

You will need to make sure you replace ```{PROJECTNAME}``` and ```{APIKEY}``` with your new Hosted Form.io project name (found in the API url), as well as the API key that was created in the second step above.

Adding API Keys to your server
--------------------
API Keys are used for server to server communication. To add API Key(s) to your server you will need to put the property 
API_KEYS in your environment variables when running the server with node. You can do this by running your server using the following command  
``API_KEYS=<yourapikey(s)> node --no-node-snapshot main.js``

License Change (March 8th, 2020)
--------------------
This library is now licensed under the OSL-v3 license, which is a copy-left OSI approved license. Please read the license @ https://opensource.org/licenses/OSL-3.0 for more information. Our goal for the change to OSLv3 from BSD is to ensure that appropriate Attribution is provided when creating proprietary products that leverage or extend this library.

Help
--------------------
We will be updating the help guides found @ https://help.form.io as questions arise and also to help you get started with Form.io.

Thanks for using Form.io!

The Form.io Team.

Security
=========
If you find and/or think you have found a Security issue, please quietly disclose it to security@form.io, and give us
sufficient time to patch the issue before disclosing it publicly.

test change 5