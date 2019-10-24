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

Run with Docker Compose
------------------
The fastest way to run this library locally is to use [Docker](https://docker.com).

 - [Install Docker](https://docs.docker.com/v17.12/install/)
 - Download and unzip this package to a local directory on your machine.
 - Open up your terminal and navigate to the unzipped folder of this library.
 - Type the following in your terminal
    ```
    npm install
    docker-compose up
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
    - On Mac I recomment using Homebrew ```brew install mongodb```
    - On Windows, download and install the MSI package @ https://www.mongodb.org/downloads
  - You must then make sure you have MongoDB running by typing ```mongod``` in your terminal.

Running with Node.js
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

Commerical Features
-------------------

There are many premium features and actions that are not available without the Portal and the commercial platform.  These include PDFs, multi-tenanted platform application ability, branded emails with templates, advanced conditional logic, webhook interfaces, and more.

Available only in Commercial:

1. PDF’s
2. OAuth - OpenID Connect
3. FormviewPro
4. LDAP Authentication
5. SAML Authentication
6. Form Manager: Customizable Form-builder Interface tor non-developer users and groups. 
7. Advanced Webhooks
8. Team management
9. Collaboration on Forms
10. Audit Logging
11. Multi-tenant management
12. Email Templates (coming soon)
13. Temp tokens & Email based authentication
14. Report API (aggregated reports)
15. Staging and Deployment (SDLC)s
16. Form Submission Collections (saving submissions to different collections for indexing)
17. Form Versioning
18. Encrypted Fields
19. Offline Forms
20. File Uploads
21. CORS Configuration
22. SQL Connectors
23. Kickbox integration
24. Google Sheets
25. Atlassian (JIRA) integration
26. Office 365 integration
27. Hubspot integration
28. CSS templating 
29. Docker Containers with updates
30. External JWT tokens
31. Private File Uploads




Deploy to Hosted Form.io
--------------------
If you wish to deploy all of your forms and resources into the Form.io Hosted platform @ https://form.io, you can do this by using the Form.io CLI command line tool.

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

You will need to make sure you replace ```{PROJECTNAME}``` and ```{APIKEY}``` with your new Hosted Form.io project name (found in the API url), as well as the API key that was created in the second step above.

This will then ask you to log into the local Form.io server (which can be provided within the Admin resource), and then after it authenticates, it will export the project and deploy that project to the Form.io hosted form.

Help
--------------------
We will be updating the help guides found @ https://help.form.io as questions arise and also to help you get started with Form.io.

Thanks for using Form.io!

The Form.io Team.

Security
=========
If you find and/or think you have found a Security issue, please quietly disclose it to security@form.io, and give us
sufficient time to patch the issue before disclosing it publicly.
