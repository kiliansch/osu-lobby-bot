require("dotenv").config()

const Banchojs = require("bancho.js")
const { exit } = require("process");
const { resolve } = require("uri-js");
const client = new Banchojs.BanchoClient({username: process.env.OSU_USER, password: process.env.OSU_PASS, apiKey: process.env.API_KEY});

/**
 * Class representing auto host bot
 */
class AutohostBot {
    /**
     * Setup variables, parse options and start the bot
     * 
     * @param {BanchoClient} client 
     */
    constructor(client) {
        this._lobbyName = "osu-autohost-bot";
        this._minStars = 0;
        this._maxStars = 0;
        this._playerList = [];
        this._alreadyChosen = [];
        this._currentHost = null;
        this._beatmap = 0;
        this._lobby = null;
        this._channel = null;
        this._client = client;
        this._gameId = 0;

        this._parseOptions(process.argv.slice(2));

        this._startBot();
    }

    /**
     * Start the bot to a given game id, initialize players and setup listeners
     */
    _startBot() {
        this._client.connect().then(async () => {
            console.log("Login successful!");

            // Join multiplayer game
            this._channel = await this._client.getChannel(`#mp_${this._gameId}`);
            await this._channel.join();
            this._lobby = this._channel.lobby;

            this._initializePlayers();

            await Promise.all([
                this._lobby.setSettings(0, 0, 8),
                this._lobby.setMods("Freemod", true)
            ]);
            console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${this._lobby.id}`);

            this._setupListeners();
        }).catch(console.error)
    }

    /**
     * Set up listeners for certain game actions
     */
    _setupListeners() {
        this._lobby.banchojs.on("error", (err) => {
            console.error(err);
        })

        this._lobby.on("playerJoined", (obj) => {
            if (obj.player.user.isClient()) {
                this._lobby.setHost(`#${obj.player.user.id}`)
                this._currentHost = obj.player.user.username;
            }

            if (this._playerList.length + this._alreadyChosen === 1) {
                this._playerList.shift();
            }

            this._addToHostQueue(obj.player.user.username);

            this._announceNextHosts();
        });    

        this._lobby.on("playerLeft", (obj) => {
            this._playerList = this._playerList.filter((value) => {
                return value !== obj.user.username
            });

            this._alreadyChosen = this._alreadyChosen.filter((value) => {
                return value !== obj.user.username
            });
    
            this._announceNextHosts();
        });
    
        this._lobby.on("matchFinished", (scores) => {
            this._rotateHost();
        });
    
        this._lobby.on("beatmap", async (beatmap) => {
            if (beatmap == null || !this._beatmapDifficultyRestricted()) {
                return;
            }

            if (this._beatmapTooLow(beatmap)) {
                // Beatmap too low.
                this._channel.sendMessage(`${this._currentHost} this beatmap is too low, minimum stars are ${this._minStars}. If you start with these settings, match will be aborted and host will be passed to the next in line.`);

            }

            if (this._beatmapTooHigh(beatmap)) {
                // Beatmap too high.
                this._channel.sendMessage(`${this._currentHost} this beatmap is too high, maximum stars are ${this._maxStars}. If you start with these settings, match will be aborted and host will be passed to the next in line.`);
            }
        });

        this._lobby.on("matchStarted", () => {
            if (!this._beatmapDifficultyRestricted()) {
                return;
            }

            if (this._beatmapTooHigh(this._lobby.beatmap) || this._beatmapTooLow(this._lobby.beatmap)) {
                this._channel.sendMessage(`${this._currentHost} you have been warned.`)
                this._lobby.abortMatch();
                this._rotateHost();
            }
        });

        // Admin / Operator commands
        this._client.on("CM", (message) => {
            if (!message.user.isClient()) {
                return;
            }

            // Skip to given user name
            const r = /^(\!skipTo) (.+)$/i
            if (r.test(message.message)) {
                const m = r.exec(message.message);

                this._skipHostToPlayer(m[2]);
            }
        });

        this._client.on("CM", (message) => {
            const r = /^\!skip$/i
            if (r.test(message.message)) {
                this._skipHostTurn(message.user);
            }
        });

        process.on("SIGINT", async () => {
            console.log("SIGINT received. Closing lobby and exiting...")

            this._client.disconnect();
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
     * Build lobby name
     */
    _parseLobbyName() {
        if (this._minStars <= 0 && this._maxStars > 0) {
            this._lobbyName = `${this._lobbyName} | 1-${this._maxStars}*`
        } else if (this._minStars > 0 && this._maxStars <= 0) {
            this._lobbyName = `${this._lobbyName} | Min: ${this._minStars}*`
        } else if (this._minStars > 0 && this._maxStars > 0) {
            this._lobbyName = `${this._lobbyName} | ${this._minStars}-${this._maxStars}*`
        }
    }

    /**
     * Host rotation
     */
    _rotateHost() {
        let nextPlayer;

        if (this._playerList.length > 0) {
            let lastHost = this._currentHost;

            nextPlayer = this._playerList.shift();

            // Avoid the same host twice in a row if not alone in lobby
            if (nextPlayer == lastHost && (this._playerList.length + this._alreadyChosen.length) > 1) {
                this._alreadyChosen.push(nextPlayer);    
                nextPlayer = this._playerList.shift();
            }

            this._lobby.setHost(nextPlayer);
            this._currentHost = nextPlayer;

            this._alreadyChosen.push(nextPlayer);

        } else if (this._playerList.length == 0) {
            this._playerList = this._alreadyChosen;
            this._alreadyChosen = [];

            this._announceNextHosts();

            this._rotateHost();

            return;
        }

        this._announceNextHosts();
    }

    /**
     * Skip host to given player name
     * @param {string} playerName 
     */
    _skipHostToPlayer(playerName) {
        const playerListIndex = this._playerList.indexOf(playerName);
        const alreadyChosenIndex = this._alreadyChosen.indexOf(playerName);
        let nextPlayer;
        let hostFound = false;

        if (playerListIndex > -1 || alreadyChosenIndex > -1) {
            this._channel.sendMessage(`Skipping host to ${playerName}`);
        }

        if (playerListIndex > -1) {
            while (this._playerList.length > 0) {
                nextPlayer = this._playerList.shift();
                if (nextPlayer == playerName) {
                    this._lobby.setHost(nextPlayer);
                    this._currentHost = nextPlayer;

                    this._alreadyChosen.push(nextPlayer);

                    hostFound = true;
                    break;
                }

                this._alreadyChosen.push(nextPlayer);
            }
        }

        if (hostFound == false && alreadyChosenIndex > -1) {
            this._playerList.push(this._alreadyChosen.splice(alreadyChosenIndex, 1));

            this._rotateHost();
        }


    }

    /**
     * Skip turn as a host
     * @param {Banchojs.BanchoUser} user
     */
    _skipHostTurn(user) {
        // console.log(user);
    }

    /**
     * Host name announcing
     */
    _announceNextHosts() {
        let upcomingHosts = this._playerList;
        if (upcomingHosts.length === 0) {
            upcomingHosts = ["Next round starting after."]
        }

        this._channel.sendMessage("Upcoming hosts: " + upcomingHosts.join(", "));
    }

    /**
     * Getter for beatmap difficulty restriction
     */
    _beatmapDifficultyRestricted() {
        return (this._minStars > 0 || this._maxStars > 0);
    }

    /**
     * Check for beatmap difficulty too low
     * @param {beatmap} beatmap 
     */
    _beatmapTooLow(beatmap) {
        this._minStars > 0 && beatmap.difficultyRating < this._minStars
    }

    /**
     * Check for beatmap difficulty too high
     * @param {beatmap} beatmap 
     */
    _beatmapTooHigh(beatmap) {
        return this._maxStars > 0 && beatmap.difficultyRating > this._maxStars;
    }

    /**
     * Adds an upcoming host to the queue
     * @param {string} playerName 
     */
    _addToHostQueue(playerName) {
        let playerList;

        // make sure we have no duplicates
        playerList = this._playerList.filter((value) => {
            return value !== playerName
        });

        // Don't add current host if more ppl joined
        if (playerList.length > 1) {
            playerList = this._playerList.filter((value) => {
                return value !== this._currentHost
            });
        }

        playerList.push(playerName);
        this._playerList = playerList;
    }

    /**
     * Initialize players present in the game. Set host if only one player is present.
     * Will reset host to the first player present.
     */
    _initializePlayers() {
        this._client.users.forEach((key, value, map) => {
            if (value === 'banchobot') {
                return;
            }

            this._playerList.push(value);
        });

        let nextPlayer;
        if (this._playerList.length > 0) {
            nextPlayer = this._playerList.shift();
            this._currentHost = nextPlayer;
            this._alreadyChosen.push(nextPlayer);

            this._lobby.setHost(nextPlayer);
        }

        this._announceNextHosts();
    }
}

new AutohostBot(client);