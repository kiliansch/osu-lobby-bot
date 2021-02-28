require("dotenv").config()

const Banchojs = require("bancho.js")
const { exit } = require("process");
const { resolve } = require("uri-js");
const client = new Banchojs.BanchoClient({username: process.env.OSU_USER, password: process.env.OSU_PASS, apiKey: process.env.API_KEY});

/**
 * 
 */
class AutohostBot {
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
        this._password = null;
        this._client = client;

        this._parseOptions(process.argv.slice(2));
        this._parseLobbyName();

        this._startBot();
    }

    _startBot() {
        this._client.connect().then(async () => {
            console.log("Login successful!");

            // Create new lobby
            this._channel = await this._client.createLobby(this._lobbyName)
            this._lobby = this._channel.lobby;
        
            this._password = Math.random().toString(36).substring(8);
            await Promise.all([
                this._lobby.setSettings(0, 0, 16),
                this._lobby.setMods("Freemod", true)
            ]);
        
            console.log(`Lobby created! Name: ${this._lobby.name}, Password: ${this._password}`);
            console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${this._lobby.id}`);

            this._setupListeners();
        }).catch(console.error)
    }

    _setupListeners() {
        this._lobby.banchojs.on("error", (err) => {
            console.error(err);
        })

        this._lobby.on("playerJoined", (obj) => {
            if (obj.player.user.isClient()) {
                this._lobby.setHost(`#${obj.player.user.id}`)
                this._currentHost = obj.player.user.username;
            }

            this._playerList.push(obj.player.user.username)

            this._announceNextHosts();
        });    

        this._lobby.on("playerLeft", (obj) => {
            this._playerList = this._playerList.filter((value) => {
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

        process.on("SIGINT", async () => {
            console.log("SIGINT received. Closing lobby and exiting...")
    
            await this._lobby.closeLobby();
            this._client.disconnect();
        });
    }

    _parseOptions(options) {
        switch (options.length) {
            case 3:
                this._maxStars = parseFloat(options[2])
            case 2:
                this._minStars = parseFloat(options[1])
            case 1:
                this._lobbyName = options[0];
                break;
        }
    }

    _parseLobbyName() {
        if (this._minStars <= 0 && this._maxStars > 0) {
            this._lobbyName = `${this._lobbyName} | 1-${this._maxStars}*`
        } else if (this._minStars > 0 && this._maxStars <= 0) {
            this._lobbyName = `${this._lobbyName} | Min: ${this._minStars}*`
        } else if (this._minStars > 0 && this._maxStars > 0) {
            this._lobbyName = `${this._lobbyName} | ${this._minStars}-${this._maxStars}*`
        }
    }

    _rotateHost() {
        let nextPlayer;
        let playerInfo

        if (this._playerList.length > 0) {
            nextPlayer = this._playerList.shift();
        
            playerInfo = this._lobby.getPlayerByName(nextPlayer);

            console.log(playerInfo);


            this._lobby.setHost(nextPlayer);
            this._currentHost = nextPlayer;

            this._alreadyChosen.push(nextPlayer);
        }
        
        if (this._playerList.length == 0) {
            this._playerList = this._alreadyChosen;
        }

        this._announceNextHosts();
    }

    _announceNextHosts() {
        this._channel.sendMessage("Upcoming hosts: " + this._playerList.join(", "));
    }

    _beatmapDifficultyRestricted() {
        return (this._minStars > 0 || this._maxStars > 0);
    }

    _beatmapTooLow(beatmap) {
        this._minStars > 0 && beatmap.difficultyRating < this._minStars
    }

    _beatmapTooHigh(beatmap) {
        return this._maxStars > 0 && beatmap.difficultyRating > this._maxStars;
    }
}

new AutohostBot(client);