# Used by docker-compose.yml to deploy the formio application
# (When modified, you must include `--build` )
# -----------------------------------------------------------

# Use Node image, maintained by Docker:
# hub.docker.com/r/_/node/
FROM node:11
WORKDIR /app

# Only include the required dependencies
# We will mount the source-code
COPY ./package.json .
COPY ./package-lock.json .

# Install globally, so we can overwrite the entire
# /app folder at runtime (volume mount)
RUN npm install -g

# Set this to inspect more from the application. Examples:
#   DEBUG=formio:db (see index.js for more)
#   DEBUG=formio:*
ENV DEBUG=""

# This will initialize the application based on
# some questions to the user (login email, password, etc.)
ENTRYPOINT [ "node", "main" ]