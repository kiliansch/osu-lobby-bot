const logger = require('../../logging/logger');

class PlayerQueue {
  constructor(bot) {
    this.queue = [];
    this.currentHost = null;
    this.currentHostLobbyPlayer = null;
    this.bot = bot;
    this.rotationChange = true;

    this.setupPlayerQueue();
  }

  /**
   * Skip queue to given player name. All players that have been skipped are being appended.
   *
   * @param {string} playerName
   */
  skipTo(playerName) {
    const playerObj = this.queue.find((o) => o.name === playerName);

    if (!playerObj) {
      this.bot.channel.sendMessage(`Can't find a player named: ${playerName} :(`);
    }

    this.bot.channel.sendMessage(`Skipping host to ${playerName}`);

    let upcomingHost;
    const iterator = 0;
    let hostFound = false;

    while (iterator <= this.queue.length) {
      upcomingHost = this.queue.shift();
      if (upcomingHost.name === playerName) {
        this.rotationChange = true;
        this.bot.channel.lobby.setHost(playerName);
        this.currentHost = playerName;

        this.queue.push(upcomingHost);
        hostFound = true;
        break;
      }

      this.queue.push(upcomingHost);
    }

    if (!hostFound) {
      this.bot.channel.sendMessage('Skipping has failed.');
    } else {
      this.bot.channel.sendMessage(`Skipped hosts up to ${playerName}`);
      this.announcePlayers();
    }

    this.rotationChange = false;
  }

  skipTurn(playerName) {
    const playerObj = this.queue.find((o) => o.name === playerName);

    if (this.currentHost === playerName) {
      this.next();
    } else {
      this.queue = this.queue.filter((playerElement) => playerElement.name !== playerName);
      this.queue.push(playerObj);

      this.bot.channel.sendMessage(`Skipping ${playerName}.`);
      this.announcePlayers();
    }
  }

  add(playerName, lobbyPlayer) {
    this.queue.push({
      name: playerName,
      lobbyPlayer,
    });

    if (this.queue.length === 1) {
      this.next();
    }
  }

  remove(playerName) {
    this.queue = this.queue.filter((playerObj) => playerObj.name !== playerName);
  }

  /**
   * Set next host and add it again at the end of the queue.
   */
  async next() {
    this.rotationChange = true;
    const nextPlayer = this.queue.shift();
    this.currentHost = nextPlayer.name;
    this.currentHostLobbyPlayer = nextPlayer.lobbyPlayer;

    const stats = await nextPlayer.lobbyPlayer.user.stats();
    if (stats.status === 'Afk') {
      this.bot.channel.sendMessage(
        `Upcoming host named ${nextPlayer.name}s status is ${stats.status}. Skipping.`
      );

      this.queue.push(nextPlayer);
      this.next();
    } else {
      this.bot.channel.lobby.setHost(nextPlayer.name);

      this.announcePlayers();
      this.queue.push(nextPlayer);

      this.rotationChange = false;
    }
  }

  /**
   * Moves the current host to the end of the queue. This is supposed
   * to be called after the match ended and before the next player is
   * getting host.
   */
  moveCurrentHostToEnd() {
    const playerObj = this.queue.find((o) => o.name === this.currentHost);

    if (playerObj) {
      this.remove(this.currentHost);
      this.queue.push({
        name: this.currentHost,
        lobbyPlayer: this.currentHostLobbyPlayer,
      });
    }
  }

  /**
   * Gets a comma seperated list with players
   */
  getQueueNames() {
    const playerNameList = this.queue.map((obj) => obj.name);

    return `${playerNameList.join(', ')} ...`;
  }

  /**
   * Set up the queue
   */
  setupPlayerQueue() {
    if (this.bot.channel.lobby.players.length === 0) {
      return logger.error("No players found. Can't continue!");
    }

    Object.keys(this.bot.channel.lobby.players).forEach((playerName) => {
      if (this.bot.channel.lobby.players[playerName].isHost === true) {
        this.currentHost = playerName;
      } else {
        this.add(playerName, this.bot.channel.lobby.players[playerName]);
      }
    });

    if (this.currentHost) {
      // Add host to end
      this.add(this.currentHost, this.bot.channel.lobby.players[this.currentHost]);
    }

    logger.info(`Initialized ${this.queue.length} players with ${this.currentHost} as Host.`);
    return this.announcePlayers();
  }

  announcePlayers() {
    this.bot.channel.sendMessage(`Upcoming hosts: ${this.getQueueNames()}`);
  }
}

module.exports = PlayerQueue;
