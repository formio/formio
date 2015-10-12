Form.io: The Form and API platform.
===============================
Form.io is a revolutionary Form and API platform for developers. This repository serves as the core Form and API engine
for https://form.io. This system allows you to build next generation Web 3.0 applications using a simple drag-and-drop
form builder interface. These forms can then easily be embedded within your Angular.js and React applications using the
```<formio>``` HTML element. 

Installation
-------------------
To get started you will first need the following installed on your machine.

  - Node.js - https://nodejs.org/en/
  - MongoDB - http://docs.mongodb.org/manual/installation/
    - On Mac I recomment using Homebrew ```brew install mongodb```
    - On Windows, download and install the MSI package @ https://www.mongodb.org/downloads
  - You must then make sure you have MongoDB running by typing the following.
    - ```mongod```

Running
-------------------
You can then download this repository, navigate to the folder in your Terminal, and then type the following.

```
npm install
node server
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

Help
--------------------
We will updating the help guides found @ https://help.form.io as questions arise and also to help you get started with Form.io.

Thanks for using Form.io!

The Form.io Team.
