# Formio Forked Repo 

1. Change the mongo connection string in config/default.json to point to the desired database
Eg: for stage 
``` mongodb://formiostage:zC2T7JcwISqs@52.60.132.94/formio_stage ```
The format is 
``` mongodb://[username]:[password]@[db_host]/[db_name] ```
For more information on connection strings go to https://docs.mongodb.com/manual/reference/connection-string/

2. npm install
3. npm start

Go to the url in the console to view the build app
