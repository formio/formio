# Used by docker-compose.yml to deploy the formio application
# (When modified, you must include `--build` )
# -----------------------------------------------------------

# Use Node image, maintained by Docker:
# hub.docker.com/r/_/node/
FROM node:20-alpine3.19

# Copy source dependencies
COPY src/ /app/src/
COPY config/ /app/config
COPY *.js /app/
COPY *.txt /app/
COPY package.json /app/
COPY package-lock.json /app/
COPY default-template.json /app/

COPY portal/src /app/portal/src
COPY portal/public /app/portal/public
COPY portal/package.json /app/portal/package.json
COPY portal/package-lock.json /app/portal/package-lock.json
COPY portal/tsconfig.json /app/portal/tsconfig.json
COPY portal/webpack.config.mjs /app/portal/webpack.config.mjs


WORKDIR /app

# "bcrypt" requires python/make/g++, all must be installed in alpine
# (note: using pinned versions to ensure immutable build environment)
RUN apk update && \
    apk upgrade && \
    apk add make && \
    apk add python3 && \
    apk add g++ && \
    apk add git

# install dependencies
RUN npm i
# build the client application
WORKDIR /app/portal
RUN npm i
RUN npm run build

RUN apk del git

# Set this to inspect more from the application. Examples:
#   DEBUG=formio:db (see index.js for more)
#   DEBUG=formio:*
ENV DEBUG=""

# This will initialize the application based on
# some questions to the user (login email, password, etc.)
ENTRYPOINT [ "node", "--no-node-snapshot", "main" ]
