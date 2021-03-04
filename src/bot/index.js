const EventEmitter = require('events').EventEmitter;

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const Bancho = require('bancho.js')
const Client = new Bancho.BanchoClient({ username: process.env.OSU_USER, password: process.env.OSU_PASS, apiKey: process.env.API_KEY });

const listeners = require('./listeners')
const PlayerQueue = require('./utils/playerQueue')

/**
 * Bot class
 */
class Bot extends EventEmitter {
    /**
     * @param {Bancho.BanchoClient} Client 
     */
    constructor(Client) {
        super();
        this.minStars = 3.5;
        this.maxStars = 4.5;
        this.channel = null;
        this.client = Client;
        this.gameId = 77197897;

        this.playerQueue = null;

        this._parseOptions(process.argv.slice(2));
    }

    /**
     * Start the bot to a given game id, initialize players and setup listeners
     */
    async start() {
        try {
            await this.client.connect();
            console.log("Login successful!");

            this.channel = await this.client.getChannel(`#mp_${this.gameId}`)
            
            console.log("Joining channel.");
            await this.channel.join();

            console.log("Updating settings.");
            await this.channel.lobby.setSettings(0, 0, 8);
            await this.channel.lobby.setMods("", true);

            // Initialize player list
            // Setup listeners

            console.log("Setting up listeners.");
            this._setupLobbyListeners();
            this._setupClientListeners();

            console.log("Initializing players.");
            this.playerQueue = new PlayerQueue(this);

            //console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${this._lobby.id}`);
        } catch (error) {
            console.error('Error starting bot', error);
        }
    }

    _setupLobbyListeners() {
        // Beatmap
        this.channel.lobby.on("beatmap", async (beatmap) => {
            listeners.lobby.beatmap.forEach((beatmapListener) => {
                new beatmapListener(beatmap, this).listener();
            })
        });

        this.channel.lobby.on("playerJoined", (obj) => {
            this.playerQueue.add(obj.player.user.username, obj.player);
        });

        this.channel.lobby.on("playerLeft", (obj) => {
            this.playerQueue.remove(obj.user.username);
        });
    }

    _setupClientListeners() {
        // Admin / Operator commands
        this.client.on("CM", (message) => {
            if (!message.user.isClient()) {
                return;
            }

            // Skip to given user name
            const r = /^(\!skipTo) (.+)$/i
            if (r.test(message.message)) {
                const m = r.exec(message.message);
                this.playerQueue.skipTo(m[2]);
            }
        });

        this.client.on("CM", (message) => {
            const r = /^\!skip$/i
            if (r.test(message.message)) {
                this.playerQueue.skipTurn(message.user.username);
            }
        });
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

    /**
     * Initialize players present in the game. Set host if only one player is present.
     * Will reset host to the first player present.
     */
    _initializePlayers() {
        console.log(this.channel.lobby.players);

        // Key = BanchoUser
        // console.log('KEY');
        // this.client.users.forEach((key, value, map) => {
        //     console.log(key);
        // });

        // Value = username
    }
}

const bot = new Bot(Client);

module.exports = bot;