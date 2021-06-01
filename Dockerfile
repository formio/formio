# Used by docker-compose.yml to deploy the formio application
# (When modified, you must include `--build` )
# -----------------------------------------------------------

# Use Node image, maintained by Docker:
# hub.docker.com/r/_/node/
FROM node:lts-alpine3.10
WORKDIR /app

# "bcrypt" requires python/make/g++, all must be installed in alpine
# (note: using pinned versions to ensure immutable build environment)
RUN apk update && \
    apk upgrade && \
    apk add make=4.2.1-r2 && \
    apk add g++=8.3.0-r0

# At least one buried package dependency is using a `git` path.
# Hence we need to haul in git.
RUN apk --update add git
# Use https to avoid requiring ssh keys for public repos.
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

# Using an alternative package install location
# to allow overwriting the /app folder at runtime
# stackoverflow.com/a/13021677
ENV NPM_PACKAGES=/.npm-packages \
    PATH=$NPM_PACKAGES/bin:$PATH \
    NODE_PATH=$NPM_PACKAGES/lib/node_modules:$NODE_PATH
RUN echo "prefix = $NPM_PACKAGES" >> ~/.npmrc

# Include details of the required dependencies
COPY ./package.json $NPM_PACKAGES/
COPY ./package-lock.json $NPM_PACKAGES/

# Use "Continuous Integration" to install as-is from package-lock.json
RUN npm ci --prefix=$NPM_PACKAGES

RUN apk del git

# Link in the global install because `require()` only looks for ./node_modules
# WARNING: This is overwritten by volume-mount at runtime!
#          See docker-compose.yml for instructions
RUN ln -sf $NPM_PACKAGES/node_modules node_modules

# Set this to inspect more from the application. Examples:
#   DEBUG=formio:db (see index.js for more)
#   DEBUG=formio:*
ENV DEBUG=""

# This will initialize the application based on
# some questions to the user (login email, password, etc.)
ENTRYPOINT [ "node", "main" ]
