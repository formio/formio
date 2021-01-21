# Endringer i denne forken

## Heroku support

Vi har endret main.js til å hente listen port fra env var PORT. 
Dette er gjort fordi heroku setter PORT til den porten den ruter trafikken til.

## Deployment med docker

Den originale docker filen prøver å støtte at serveren laster 
ned en GUI app under oppstart (installasjonsscript). Dette fungerer ikke av flere grunner
, hvorav en er at heroku ikke støtter skriving til disk. 
Vi har derfor "hacket" til deployment ved å gjøre manuelle steg og så bygge docker container




