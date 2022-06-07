# Form Management Platform

![Formio](https://img.shields.io/badge/formio-2.3.0-blue)

**formsflow.ai** leverages form.io to build "serverless" data management applications using a simple drag-and-drop form builder interface.

To know more about form.io, go to  <https://form.io>.

## Table of Content

1. [Prerequisites](#prerequisites)
2. [Solution Setup](#solution-setup)
   * [Step 1 : Keycloak Setup](#keycloak-setup)
   * [Step 2 : Installation](#installation)
   * [Step 3 : Running the Application](#running-the-application)
   * [Step 4 : Health Check](#health-check)
3. [Formsflow-forms API Requesting](#formsflow-forms-api-requesting)  
   * [Using POSTMAN API client](#using-postman-api-client)
   * [Using curl command](#using-curl-command)
4. [Custom Components](#custom-components)
5. [Adding new indexes](#adding-new-indexes)
6. [LICENSE](#license)

## Prerequisites

* For docker based installation [Docker](https://docker.com) need to be installed.

## Solution Setup

### Keycloak Setup

Not applicable.  
**Please note that the forms-flow-forms server is accessed using root user account.**

### Installation

* Make sure you have a Docker machine up and running.
* Make sure your current working directory is "forms-flow-ai/forms-flow-forms".
* Rename the file [sample.env](./sample.env) to **.env**.
* Modify the environment variables in the newly created **.env** file if needed. Environment variables are given in the table below,
* **NOTE : `{your-ip-address}` given inside the .env file should be changed to your host system IP address. Please take special care to identify the correct IP address if your system has multiple network cards**

> :information_source: Variables with trailing :triangular_flag_on_post: in below table should be updated in the .env file

|Variable name | Meaning | Possible values | Default value |
|--- | --- | --- | ---
|`FORMIO_DB_USERNAME`|Mongo Root Username. Used on installation to create the database.Choose your own||`admin`
|`FORMIO_DB_PASSWORD`|Mongo Root Password||`changeme`
|`FORMIO_DB_NAME`|Mongo Database  Name. Used on installation to create the database.Choose your own||`formio`
|`FORMIO_ROOT_EMAIL`|forms-flow-forms admin login|eg. admin@example.com|`admin@example.com`
|`FORMIO_ROOT_PASSWORD`|forms-flow-forms admin password|eg.changeme|`changeme`
|`FORMIO_DEFAULT_PROJECT_URL`:triangular_flag_on_post:|forms-flow-forms default url||`http://{your-ip-address}:3001`
|`FORMIO_JWT_SECRET`|forms-flow-forms jwt secret| |`--- change me now ---`

**Additionally, you may want to change these**

* The value of Mongo database details (especially if this instance is not just for testing purposes)
* The value of ROOT user account details (especially if this instance is not just for testing purposes)
  
### Running the application

* forms-flow-forms service uses port 3001, make sure the port is available.
* `cd {Your Directory}/forms-flow-ai/forms-flow-forms`

* For Linux,
  * Run `docker-compose -f docker-compose-linux.yml up -d` to start.
* For Windows,
  * Run `docker-compose -f docker-compose-windows.yml up -d` to start.

*NOTE: Use --build command with the start command to reflect any future **.env** changes eg : `docker-compose -f docker-compose-windows.yml up --build -d`*

#### To stop the application

* For Linux,
  * Run `docker-compose -f docker-compose-linux.yml stop` to stop.
* For Windows,
  * Run `docker-compose -f docker-compose-windows.yml stop` to stop.

### Health Check

   The application should be up and available for use at port defaulted to 3001 in  (i.e. <http://localhost:3001/>)

        Default Login Credentials
        -----------------
        User Name / Email : admin@example.com
        Password  : changeme

## Formsflow-forms user/role API

There are two ways in which you can access data from the formsflow-forms end points.

* [Using curl command](#using-curl-command)
* [Using POSTMAN API client](#using-postman-api-client)

### Using curl command

* Download and install [curl](https://curl.se/download.html).

* [Step 1](#step-1) Go to `forms-flow-forms/script` directory.
* [Step 2](#step-2)
  * **For windows**
    * Open command prompt and run `resourceId_windows.bat {user email} {password}` eg: `resourceId_windows.bat admin@example.com changeme`
  * **For Linux and Mac**
    * Open command prompt and run `./resourceId_linux.sh {user email} {password}` eg: `./resourceId_linux.sh admin@example.com changeme`
* [Step 3](#step-3) Copy the ID corresponding to Role Name from [Step 2](./README.md#step-2) and paste it against the Environment Variable name from the below table.

|Role Name | Environment Variable Name |
|--- |---
|Administrator | DESIGNER_ROLE_ID
|Anonymous | ANONYMOUS_ID
|formsflow Client | CLIENT_ROLE_ID
|formsflow Reviewer | REVIEWER_ROLE_ID
|User | USER_RESOURCE_ID

> **curl requests are successfully completed. You can skip the remaining sections in this page and continue with other installation steps.**

### Using POSTMAN API client

* Download and install [Postman API client](https://www.postman.com/)
* Import [formsflow-forms-postman-collection.json](./config/formsflow-forms-postman-collection.json) to your postman client.
  * Open Postman -> Go to File
    * Import -> Upload [formsflow-forms-postman-collection.json](./config/formsflow-forms-postman-collection.json) file
    * Import successful.
* Follow the instructions given below to fetch the role id's from [forms-flow-forms](http://localhost:3001)
  * Open Postman ->  Go to Workspaces -> My Workspaces
    * Collections -> Open form.io collection and send the API request in the following order.
       * Get the jwt token using resource **<http://localhost:3001/user/login>**. (*Click on Send to make a server request*)
       * Get the user resource id using resource **<http://localhost:3001/user>**. (*Click on Send to make a server request*)
        * Copy the **_id** from Response body and replace value for **USER_RESOURCE_ID** in the **.env** file.
       * Get the user role id's using resource **<http://localhost:3001/role>**. (*Click on Send to make a server request*)
        * Copy the **_id** with title *Administrator* from Response body and replace value for **DESIGNER_ROLE_ID** in the **.env** file.
        * Copy the **_id** with title *Anonymous* from Response body and replace value for **ANONYMOUS_ID** in the **.env** file.
        * Copy the **_id** with title *formsflow Client* from Response body and replace value for **CLIENT_ROLE_ID** in the **.env** file.
        * Copy the **_id** with title *formsflow Reviewer* from Response body and replace value for **REVIEWER_ROLE_ID** in the **.env** file.

> **Postman API calls are successfully completed. You can skip the remaining sections in this page and continue with other installation steps.**

## Custom Components

**formsflow.ai** has custom components supported which are created by extending the
base components within forms-flow-forms and then registering them within the core renderer.

Custom componets available in **formsflow.ai** are:

|Component Name | About | How to use |
|--- | --- | --- |
|**Text Area with Analytics** | To enable Text fields for sentiment analysis processing | [link](./custom-components/text-area-with-analytics/README.md)|

If you are interested in adding custom components for your use case in **formsflow.ai** we highly
recommend you to take a look at [Custom Component Docs](https://formio.github.io/formio.js/app/examples/customcomponent.html)
to understand how  Form.io renderer allows for the creation of Custom components.
You can also take a look at [formio.contrib](https://github.com/formio/contrib)
to look for examples and even contribute the custom components you create.

## Adding new indexes

You can add new indexes in Mongodb shell, according to your requirement. You can create indexes like below example:

```
db.submissions.createIndex({
    "data.applicationStatus ": 1
})
```

In this example:

* `submissions` is the collection name.
* `data.applicationStatus` is the fields which are to be added in index.

## LICENSE

We have build formsflow.ai form management platform leveraging [formio](https://github.com/formio/formio).
We use the OSL-v3 license similar to formio to ensure appropriate attribution is
provided to form.io. Please read the [license](./LICENSE.txt) for more information.

