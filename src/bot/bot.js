const listeners = require('./listeners');
const PlayerQueue = require('./utils/playerQueue');
const { EventEmitter } = require('events');
const { BanchoLobby, BanchoMultiplayerChannel, BanchoClient } = require('bancho.js');

/**
 * Bot class
 */
class Bot extends EventEmitter {
    /**
     * 
     * @param {BanchoClient} Client 
     * @param {string} lobbyName 
     * @param {number} teamMode 
     * @param {number} size 
     * @param {Array} mods 
     * @param {number} minStars
     * @param {number} maxStars
     */
    constructor(Client, lobbyName, teamMode, size, mods, minStars, maxStars) {
        super();
        this.lobbyName = lobbyName;
        this.teamMode = teamMode;
        this.size = size;
        this.mods = mods;
        this.minStars = minStars;
        this.maxStars = maxStars;
        this.channel = null;
        /**
         * @type {BanchoClient}
         */
        this.client = Client;
        this.allowBeatmap = false;
        this.matchRunning = null;
        this.fixedHost = false;

        this.playerQueue = null;
    }

    /**
     * Start the bot to a given game id, initialize players and setup listeners
     */
    async start() {
        try {
            if (!this.client.isConnected()) {
                await this.client.connect();
                console.log('Login successful!');
            } else {
                console.log('Already logged in. Continuing')
            }

            /**
             * @type {BanchoMultiplayerChannel}
             */
            this.channel = await this.client.createLobby(this.lobbyName);
            console.log('Created lobby.');

            console.log('Updating settings.');
            await this.channel.lobby.setSettings(this.teamMode, 0, this.size);
            await this.channel.lobby.setMods(this.mods, this.mods.indexOf("Freemod") > -1);
            console.log('Updated settings.');

            await this.channel.lobby.setPassword("");
            console.log('Removed password.');

            // Initialize player list
            // Setup listeners

            console.log('Setting up listeners.');
            this.setupLobbyListeners();
            this.setupClientListeners();

            console.log('Initializing players.');
            this.playerQueue = new PlayerQueue(this);

            console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${this.channel.lobby.id}`);
        } catch (error) {
            console.error('Error starting bot', error);
        }
    }

    setupLobbyListeners() {
    // Beatmap
        this.channel.lobby.on('beatmap', async (beatmap) => {
            listeners.lobby.beatmap.forEach((BeatmapListener) => {
                new BeatmapListener(beatmap, this).listener();
            });
        });

        this.channel.lobby.on('playerJoined', (obj) => {
            this.playerQueue.add(obj.player.user.username, obj.player);
        });

        this.channel.lobby.on('playerLeft', (obj) => {
            this.playerQueue.remove(obj.user.username);
        });

        this.channel.lobby.on('matchFinished', () => {
            this.matchRunning = false;
            this.playerQueue.next();
        });

        this.channel.lobby.on('matchStarted', async () => {
            this.matchRunning = true;
            listeners.lobby.matchStarted.forEach((MatchStartedListener) => {
                if (MatchStartedListener.name === 'RestrictedBeatmapListener') {
                    new MatchStartedListener(this.channel.lobby.beatmap, this, true).listener();
                }
            });
        });

        this.channel.lobby.on('host', (currentHost) => {
            listeners.lobby.host.forEach((HostListener) => {
                new HostListener(currentHost, this).listener();
            });
        });

        process.on("SIGINT", async () => {
            console.log("SIGINT received. Closing lobby and exiting...")

            if (this.channel.joined) {
                await this.channel.lobby.closeLobby();
            }
            
            this.client.disconnect();
        });
    }

    setupClientListeners() {
    // Admin / Operator commands
        this.client.on('CM', (message) => {
            if (!message.user.isClient()) {
                return;
            }

            // Skip to given user name
            let r = /^(!skipTo) (.+)$/i;
            if (r.test(message.message)) {
                const m = r.exec(message.message);
                this.playerQueue.skipTo(m[2]);
            }

            r = /^!allow$/i;
            if (r.test(message.message)) {
                this.allowBeatmap = true;
                this.channel.sendMessage('Beatmap restriction overriden for the next map by match owner.');
            }
        });

        this.client.on('CM', (message) => {
            const r = /^!skip$/i;
            if (r.test(message.message)) {
                this.playerQueue.skipTurn(message.user.username);
            }
        });
    }
}

module.exports = Bot;