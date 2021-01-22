# Endringer i denne forken

## Heroku support

Vi har endret main.js til å hente listen port fra env var PORT. 
Dette er gjort fordi heroku setter PORT til den porten den ruter trafikken til.

## Deployment med docker

Den originale docker filen prøver å støtte at serveren laster 
ned en GUI app under oppstart (installasjonsscript). Dette fungerer ikke av flere grunner
, hvorav en er at heroku ikke støtter skriving til disk. 
Vi har derfor "hacket" til deployment ved å gjøre manuelle steg og så bygge docker container

Man må først kjøre opp appen lokalt sånn at client folder lastes ned og installeres før man bygger docker

## Docker deployment på Heroku
Kjør kommandoene i prosjektfilen. Pass på branch.
```bash
heroku login
```
Sjekk om du har installert docker.
```bash
docker ps
```
Logg inn heroku.
```bash
heroku container:login
```
Build docker image og push the docker image.
```bash
heroku container:push web --app #Application name at heroku#
```
Release docker image for å deploye ny endringer i den branchen.
```bash
heroku container:release web --app #Application name at heroku#
```




