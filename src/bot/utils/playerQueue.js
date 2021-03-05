class PlayerQueue {
    constructor(bot) {
        this.queue = [];
        this.currentHost = null;
        this.bot = bot;

        this._setupPlayerQueue();
    }

    /**
     * Skip queue to given player name. All players that have been skipped are being appended.
     * 
     * @param {string} playerName 
     */
    skipTo(playerName) {
        const playerObj = this.queue.find((o) => o.name === playerName);

        if (playerObj === undefined) {
            this.bot.channel.sendMessage(`Can't find a player named: ${playerName} :(`);
        }

        this.bot.channel.sendMessage(`Skipping host to ${playerName}`);

        let upcomingHost;
        let iterator = 0;
        let hostFound = false;

        while (iterator <= this.queue.length) {
            upcomingHost = this.queue.shift();
            if (upcomingHost.name == playerName) {
                this.bot.channel.lobby.setHost(playerName);
                this.currentHost = playerName;
                
                this.queue.push(upcomingHost);
                hostFound = true;
                break;
            }

            this.queue.push(upcomingHost);
        }

        if (!hostFound) {
            return this.bot.channel.sendMessage("Skipping has failed.");
        }

        this.bot.channel.sendMessage(`Skipped hosts up to ${playerName}`);
        this._announcePlayers();
    }

    skipTurn(playerName, permanent = false) {
        const playerObj = this.queue.find((o) => o.name === playerName);

        if (this.currentHost === playerName) {
            return this.next();
        }

        this.queue = this.queue.filter((playerObj) => playerObj.name !== playerName);
        this.queue.push(playerObj);

        this.bot.channel.sendMessage(`Skipping ${playerName}.`);
        this._announcePlayers();
    }

    add(playerName, lobbyPlayer) {
        this.queue.push({
            name: playerName,
            lobbyPlayer: lobbyPlayer
        });
    }

    remove(playerName) {
        this.queue = this.queue.filter((playerObj) => playerObj.name !== playerName);
    }

    /**
     * Set next host and add it again at the end of the queue.
     */
    next() {
        let nextPlayer = this.queue.shift();
        this.currentHost = nextPlayer.name;

        this.bot.channel.lobby.setHost(nextPlayer.name);

        this.queue.push(nextPlayer);

        this._announcePlayers();
    }

    /**
     * Gets a comma seperated list with players
     */
    getQueueNames() {
        let playerNameList = this.queue.map(obj => obj.name);

        return playerNameList.join(", ");
    }

    /**
     * Set up the queue
     */
    _setupPlayerQueue() {
        let playerData;

        if (this.bot.channel.lobby.players.length === 0) {
            return console.error("No players found. Can't continue!");
        }

        for (const playerName in this.bot.channel.lobby.players) {
            this.add(playerName, this.bot.channel.lobby.players[playerName])

            if (this.bot.channel.lobby.players[playerName].isHost === true) {
                this.currentHost = playerName
            }
        }

        console.log(`Initialized ${this.queue.length} players with ${this.currentHost} as Host.`);
        this._announcePlayers();
    }

    _announcePlayers() {
        this.bot.channel.sendMessage(`Upcoming hosts: ${this.getQueueNames()}`);
    }
}

module.exports = PlayerQueue;