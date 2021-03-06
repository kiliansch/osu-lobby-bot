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
        this.minStars = 4.0;
        this.maxStars = 4.99;
        this.channel = null;
        this.client = Client;
        this.gameId = 77296421;
        this.allowBeatmap = false;
        this.matchRunning = null;

        this.playerQueue = null;
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
            await this.channel.lobby.setSettings(0, 0, 10);
            await this.channel.lobby.setMods("", true);

            // Initialize player list
            // Setup listeners

            console.log("Setting up listeners.");
            this._setupLobbyListeners();
            this._setupClientListeners();

            console.log("Initializing players.");
            this.playerQueue = new PlayerQueue(this);

            console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${this.channel.lobby.id}`);
        } catch (error) {
            console.error('Error starting bot', error);
        }
    }

    _setupLobbyListeners() {
        // Beatmap
        this.channel.lobby.on("beatmap", async (beatmap) => {
            listeners.lobby.beatmap.forEach(beatmapListener => {
                new beatmapListener(beatmap, this).listener();
            })
        });

        this.channel.lobby.on("playerJoined", (obj) => {
            this.playerQueue.add(obj.player.user.username, obj.player);
        });

        this.channel.lobby.on("playerLeft", (obj) => {
            this.playerQueue.remove(obj.user.username);
        });

        this.channel.lobby.on("matchFinished", (scores) => {
            this.matchRunning = false;
            this.playerQueue.next();
        });

        this.channel.lobby.on("matchStarted", async () => {
            this.matchRunning = true;
            listeners.lobby.matchStarted.forEach(matchStartedListener => {
                if (matchStartedListener.name === "RestrictedBeatmapListener") {
                    new matchStartedListener(this.channel.lobby.beatmap, this, true).listener();
                }
            });
        });

        this.channel.lobby.on("host", (currentHost) => {
            listeners.lobby.host.forEach(hostListener => {
                new hostListener(currentHost, this).listener();
            });
        });
    }

    _setupClientListeners() {
        // Admin / Operator commands
        this.client.on("CM", (message) => {
            if (!message.user.isClient()) {
                return;
            }

            // Skip to given user name
            let r = /^(\!skipTo) (.+)$/i
            if (r.test(message.message)) {
                const m = r.exec(message.message);
                this.playerQueue.skipTo(m[2]);
            }

            r = /^\!allow$/i
            if (r.test(message.message)) {
                const m = r.exec(message.message);
                this.allowBeatmap = true;
                this.channel.sendMessage("Beatmap restriction overriden for the next map by match owner.");
            }
        });

        this.client.on("CM", (message) => {
            const r = /^\!skip$/i
            if (r.test(message.message)) {
                this.playerQueue.skipTurn(message.user.username);
            }
        });
    }
}

const bot = new Bot(Client);

module.exports = bot;