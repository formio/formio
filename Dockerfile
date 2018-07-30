FROM node:8

RUN npm install
RUN npm start

EXPOSE 3001
