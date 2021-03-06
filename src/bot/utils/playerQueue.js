const { BanchoMessage, BanchoLobbyPlayer } = require('bancho.js');
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
   * @param {BanchoMessage} message
   * @param {string} playerName
   */
  skipTo(message, playerName) {
    const playerObj = this.queue.find((o) => o.name === playerName);

    if (!playerObj) {
      return message.user.sendMessage(
        `Can't find a player named: ${playerName} :(`
      );
    }

    message.user.sendMessage(`Skipping host to ${playerName}`);

    let upcomingHost;
    let hostFound = false;

    while (true) {
      upcomingHost = this.queue.shift();
      if (upcomingHost.name === playerName) {
        this.rotationChange = true;
        this.bot.channel.lobby.setHost(playerName);
        this.currentHost = playerName;
        this.announcePlayers();
        this.queue.push(upcomingHost);
        hostFound = true;
        break;
      }

      this.queue.push(upcomingHost);
    }

    if (!hostFound) {
      message.user.sendMessage('Skipping has failed.');
    } else {
      message.user.sendMessage(`Skipped hosts up to ${playerName}`);
    }

    this.rotationChange = false;
  }

  /**
   *
   * @param {string} playerName
   */
  skipTurn(playerName) {
    const playerObj = this.queue.find((o) => o.name === playerName);

    if (this.currentHost === playerName) {
      this.next();
    } else {
      this.queue = this.queue.filter(
        (playerElement) => playerElement.name !== playerName
      );
      this.queue.push(playerObj);

      const user = this.bot.channel.channelMembers.get(playerName).user;
      user.sendMessage(`Skipped your turn`);
      user.sendMessage(`Upcoming hosts: ${this.getQueueNames()}`);
    }
  }

  /**
   *
   * @param {string} playerName
   * @param {BanchoLobbyPlayer} lobbyPlayer
   */
  add(playerName, lobbyPlayer) {
    this.queue.push({
      name: playerName,
      lobbyPlayer,
    });

    this.bot.emit('playerQueue', this.queue.length);

    if (this.queue.length === 1) {
      this.next();
    }
  }

  /**
   *
   * @param {string} playerName
   */
  remove(playerName) {
    this.queue = this.queue.filter(
      (playerObj) => playerObj.name !== playerName
    );
  }

  /**
   * Set next host and add it again at the end of the queue.
   * @param {string} additionalMessage
   */
  async next(additionalMessage = '') {
    this.rotationChange = true;
    const nextPlayer = this.queue.shift();
    this.currentHost = nextPlayer.name;
    this.currentHostLobbyPlayer = nextPlayer.lobbyPlayer;

    let more = `${this.getAnnouncePlayerString()}`;
    if (additionalMessage.length > 0) {
      more = `${more} | ${additionalMessage}`;
    }
    this.bot.channel.sendMessage(`!mp host ${nextPlayer.name}`);
    this.bot.channel.sendMessage(more);
    this.bot.emit('host', nextPlayer.name);
    this.queue.push(nextPlayer);

    this.rotationChange = false;

    this.bot.emit('playerQueue', this.queue.length);
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
      this.add(
        this.currentHost,
        this.bot.channel.lobby.players[this.currentHost]
      );
    }

    logger.info(
      `Initialized ${this.queue.length} players with ${this.currentHost} as Host.`
    );

    if (this.queue.length > 0) {
      this.announcePlayers();
    }
  }

  getAnnouncePlayerString() {
    return `Upcoming hosts: ${this.getQueueNames()} | type !botHelp for available commands`;
  }

  announcePlayers() {
    this.bot.channel.sendMessage(this.getAnnouncePlayerString());
  }
}

module.exports = PlayerQueue;
