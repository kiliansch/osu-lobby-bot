require("dotenv").config()
const Bancho = require('bancho.js');
const Bot = require('./src/bot/bot')
const CliHandler = require('./src/bot/utils/cliHandler')

const cli = new CliHandler();
const Client = new Bancho.BanchoClient({
    username: process.env.OSU_USER,
    password: process.env.OSU_PASS,
    apiKey: process.env.API_KEY,
});

(async () => {
    const options = await cli.run();
    const OsuLobbyBot = new Bot(Client, options);

    OsuLobbyBot.start();
})();
