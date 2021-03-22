FROM node:15.12

COPY . /app

WORKDIR /app

RUN yarn install

CMD node /app/question_test.js
