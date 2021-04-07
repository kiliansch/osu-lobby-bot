FROM node:15.11

COPY . /app

WORKDIR /app

RUN yarn install

RUN yarn run tsc --build node_modules/osu-sr-calculator/tsconfig.json

CMD node /app/lobbyBot.js
