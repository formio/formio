# Used by docker-compose.yml to deploy the formio application
# (When modified, you must include `--build` )
# -----------------------------------------------------------

# Use Node image, maintained by Docker:
# hub.docker.com/r/_/node/
FROM node:lts-alpine3.19

# Copy source dependencies
COPY src/ /app/src/
COPY config/ /app/config
COPY *.js /app/
COPY *.txt /app/
COPY package.json /app/

WORKDIR /app

# "bcrypt" requires python/make/g++, all must be installed in alpine
# (note: using pinned versions to ensure immutable build environment)
RUN apk update && \
    apk upgrade && \
    apk add make && \
    apk add python3 && \
    apk add g++ && \
    apk add git

# Use https to avoid requiring ssh keys for public repos.
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

# Use "Continuous Integration" to install as-is from package-lock.json
RUN yarn install

RUN apk del git

# Set this to inspect more from the application. Examples:
#   DEBUG=formio:db (see index.js for more)
#   DEBUG=formio:*
ENV DEBUG=""

# This will initialize the application based on
# some questions to the user (login email, password, etc.)
ENTRYPOINT [ "node", "--no-node-snapshot", "main" ]
