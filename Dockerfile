FROM node:15.12

COPY . /app

WORKDIR /app

RUN npm install -g yarn && yarn install

CMD ["npm", "start"]
