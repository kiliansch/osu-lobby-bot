const EventEmitter = require("events").EventEmitter;
const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")
const argv = yargs(hideBin(process.argv)).argv

const Bancho = require("bancho.js")
const Client = new Banchojs.BanchoClient({username: process.env.OSU_USER, password: process.env.OSU_PASS, apiKey: process.env.API_KEY});

/**
 * Bot class
 */
class Bot extends EventEmitter {
    /**
     * @param {Bancho.BanchoClient} Client 
     */
    constructor(Client) {
        this.minStars = 0;
        this.maxStars = 0;
        this.currentHost = null;
        this.lobby = null;
        this.channel = null;
        this.client = Client;
        this.gameId = 0;

        this.playerList = new Map();
		this.listenersInitialized = false;

        this._parseOptions(process.argv.slice(2));

        this._startBot();
    }

    /**
     * Start the bot to a given game id, initialize players and setup listeners
     */
    _startBot() {
        this.client.connect().then(async () => {
            console.log("Login successful!");

            // Join multiplayer game
            this.channel = await this.client.getChannel(`#mp_${this.gameId}`);
            await this.channel.join();
            this.lobby = this._channel.lobby;

            // Initialize player list

            await Promise.all([
                this._lobby.setSettings(0, 0, 8),
                this._lobby.setMods("Freemod", true)
            ]);
            
            console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${this._lobby.id}`);

            this._setupListeners();
        }).catch(console.error)
    }

        /**
     * Parse option array
     * @param {array} options 
     */
    _parseOptions(options) {
        switch (options.length) {
            case 3:
                this._maxStars = parseFloat(options[2])
            case 2:
                this._minStars = parseFloat(options[1])
            case 1:
                this._gameId = options[0]
                break;
        }
    }
}

module.exports = Bot;