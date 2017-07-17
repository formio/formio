[![Join the chat at https://gitter.im/formio/formio](https://badges.gitter.im/formio/formio.svg)](https://gitter.im/formio/formio?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![StackOverflow](https://www.codewake.com/badges/codewake2.svg)](http://stackoverflow.com/tags/formio)

A combined form and API platform for Serverless applications
===============================
Form.io is a revolutionary combined Form and API platform for Serverless applications. This repository serves as the core Form and API engine for https://form.io. This system allows you to build "serverless" data management applications using a simple drag-and-drop form builder interface. These forms can then easily be embedded within your Angular.js and React applications using the
```<formio>``` HTML element.

Walkthrough video and tutorial
-------------------
For a walkthrough tutorial on how to use this Open Source platform to build a Serverless application, watch the video [0 to M.E.A.N in 30 minutes](https://www.youtube.com/watch?v=d2gTYkPFhPI)

Form Building & Rendering Demo
-------------------
Here is a link to a demo of the Form Building and Form Rendering capability that can be hooked into this API platform.

http://codepen.io/travist/full/xVyMjo/

Installation
-------------------
To get started you will first need the following installed on your machine.

  - Node.js - https://nodejs.org/en/
  - MongoDB - http://docs.mongodb.org/manual/installation/
    - On Mac I recomment using Homebrew ```brew install mongodb```
    - On Windows, download and install the MSI package @ https://www.mongodb.org/downloads
  - You must then make sure you have MongoDB running by typing ```mongod``` in your terminal.

Running
-------------------
You can then download this repository, navigate to the folder in your Terminal, and then type the following.

```
npm install
npm start
```

This will walk you through the installation process.  When it is done, you will have a running Form.io management
application running at the following address in your browser.

```
http://localhost:3001
```

The installation process will also ask if you would like to download an application. If selected, the application can be found at the following URL.

```
http://localhost:8080
```

You can also see the contents of the application (for modification) within the ```app``` folder which exists inside of the folder where you downloaded this repository.

Development
--------------------
To start server with auto restart capability for development simply run this command:
```
npm run start:dev
```

Help
--------------------
We will be updating the help guides found @ https://help.form.io as questions arise and also to help you get started with Form.io.

Thanks for using Form.io!

The Form.io Team.

Security
=========
If you find and/or think you have found a Security issue, please quietly disclose it to security@form.io, and give us
sufficient time to patch the issue before disclosing it publicly.
