FROM node:15.12

COPY . /app

WORKDIR /app

RUN yarn install

CMD ["npm", "start"]
