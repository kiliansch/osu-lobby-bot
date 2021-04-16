const ConnectionStatus = require('./enums/connectionStatus');
const { EventEmitter } = require('events');
const Help = require('./utils/help');
const listeners = require('./listeners');
const logger = require('../logging/logger');
const PlayerQueue = require('./utils/playerQueue');
const ChannelCommands = require('./utils/channelCommands');
const Bancho = require('bancho.js');

/**
 * Bot class
 */
class Bot extends EventEmitter {
  /**
   *
   * @param {Bancho.BanchoClient} Client
   * @param {object} options
   */
  constructor(Client, options = {}) {
    super();
    /**
     * @prop {Array} mods
     * @prop {string} lobbyName
     * @prop {number} minStars
     * @prop {number} maxStars
     * @prop {number} winCondition
     * @prop {string} password
     * @prop {Bancho.BanchoUser} creator
     */
    const defaultOptions = {
      minStars: 0,
      maxStars: 0,
      winCondition: 0,
      password: '',
      creator: Client.getSelf(),
    };
    options = Object.assign(defaultOptions, options);

    /**
     * @type {BanchoClient}
     */
    this.client = Client;

    this.lobbyName = options.lobbyName;
    this.teamMode = options.teamMode;
    this.size = options.size;
    this.mods = options.mods;
    this.minStars = options.minStars;
    this.maxStars = options.maxStars;
    this.password = options.password;
    this.winCondition = options.winCondition;

    this.creator = options.creator;

    this.channel = null;
    this.playerQueue = null;
    this.gameId = null;
    this.lobbyListenersCallback = null;

    this.allowBeatmap = false;
    this.fixedHost = false;
    this.refs = new Set();

    this.afkTimer = null;
    this.matchTimer = null;

    this.connectionStatus = ConnectionStatus.DISCONNECTED;
  }

  /**
   * Start the bot to a given game id, initialize players and setup listeners
   */
  async start() {
    try {
      this.emit('starting');
      this.connectionStatus = ConnectionStatus.CONNECTING;
      if (!this.client.isConnected()) {
        await this.client.connect();
        logger.info('Login successful!');
      } else {
        logger.info('Already logged in. Continuing');
      }

      /**
       * @type {BanchoMultiplayerChannel}
       */
      this.channel = await this.client.createLobby(this.lobbyName);
      logger.info('Created lobby.', { lobby: this.channel.lobby });
      await this.channel.lobby.setSettings(
        this.teamMode,
        this.winCondition,
        this.size
      );
      await this.channel.lobby.setMods(
        this.mods,
        this.mods.indexOf('Freemod') > -1
      );
      await this.channel.lobby.setPassword(this.password);
      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.emit('started');

      this.setupLobbyListeners();
      this.setupChannelListeners();
      this.playerQueue = new PlayerQueue(this);

      logger.info(
        `Multiplayer Link: https://osu.ppy.sh/mp/${this.channel.lobby.id}`
      );
      this.creator.sendMessage(this.getGameInviteLink());
    } catch (error) {
      this.emit('error', error);
      logger.error('Error starting bot', error);

      this.stop();
    }
  }

  async stop() {
    if (this.channel.joined) {
      logger.info('Closing lobby...');
      await this.channel.lobby.closeLobby();
      logger.info('...Closed lobby');
    }

    logger.info('Disconnecting... Goodbye!');
    this.client.disconnect();

    this.connectionStatus = ConnectionStatus.DISCONNECTED;
  }

  setupLobbyListeners() {
    // Beatmap listner for example star restriction
    this.channel.lobby.on('beatmap', (beatmap) => {
      listeners.lobby.beatmap.forEach((BeatmapListener) => {
        new BeatmapListener(beatmap, this).listener();
      });
    });

    // Add new player to queue on join
    this.channel.lobby.on('playerJoined', (obj) => {
      listeners.lobby.playerJoined.forEach((PlayerJoinedListener) => {
        new PlayerJoinedListener(obj, this).listener();
      });
    });

    // Remove player from queue on leave
    this.channel.lobby.on('playerLeft', (obj) => {
      this.playerQueue.remove(obj.user.username);
    });

    // Rotate the host after the match is finished
    // Start round timer of 120 seconds
    this.channel.lobby.on('matchFinished', () => {
      this.emit('matchFinished');
      listeners.lobby.matchFinished.forEach((MatchFinishedListener) => {
        new MatchFinishedListener(this).listener();
      });
    });

    this.channel.lobby.on('matchStarted', () => {
      this.emit('matchStarted');
      listeners.lobby.matchStarted.forEach((MatchStartedListener) => {
        if (MatchStartedListener.name === 'RestrictedBeatmapListener') {
          const beatmap = this.channel.lobby.beatmap;
          new MatchStartedListener(beatmap, this, true).listener();
        } else {
          new MatchStartedListener(this).listener();
        }
      });
    });

    this.channel.lobby.on('host', (currentHost) => {
      listeners.lobby.host.forEach((HostListener) => {
        new HostListener(currentHost, this).listener();
      });
    });

    this.channel.lobby.on('refereeAdded', (playerName) => {
      this.refs.add(playerName);
    });

    this.channel.lobby.on('refereeRemoved', (playerName) => {
      this.refs.delete(playerName);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received.');
      this.stop();
      process.exit(0);
    });

    if (typeof this.lobbyListenersCallback === 'function') {
      this.lobbyListenersCallback();
    }
  }

  setupChannelListeners() {
    this.channel.on('PART', (member) => {
      // The lobby has been closed
      if (member.user.isClient()) {
        logger.info('Lobby has been closed.');
        this.stop();
      }
    });

    // Admin / Operator commands
    this.channel.on('message', (message) => {
      if (!this.isMessageFromOp(message)) return;

      // Skip to given user name
      ChannelCommands.addCommand(
        /^(!skipTo) (.+)$/i,
        message.message,
        (matches) => {
          this.playerQueue.skipTo(message, matches[2]);
        }
      );

      ChannelCommands.addCommand('!allow', message.message, () => {
        this.allowBeatmap = true;
        this.channel.sendMessage(
          'Beatmap restriction overriden for the next map by match owner.'
        );
      });
    });

    this.channel.on('message', (message) => {
      ChannelCommands.addCommand('!skipMe', message.message, () => {
        this.playerQueue.skipTurn(message.user.username);
      });

      ChannelCommands.addCommand('!timeLeft', message.message, () => {
        if (!Boolean(this.matchTimer)) {
          return this.channel.sendMessage('Match has not started yet.');
        }
        this.channel.sendMessage(
          `Time left for round to start ${this.matchTimer.time} seconds`
        );
      });

      ChannelCommands.addCommand('!botHelp', message.message, () => {
        const helpLines = Help.getCommands(this.isMessageFromOp(message));
        Object.keys(helpLines).forEach((key) =>
          message.user.sendMessage(helpLines[key])
        );
      });
    });
  }

  /**
   *
   * @param {BanchoMessage} message
   * @returns {Boolean}
   */
  isMessageFromOp(message) {
    return message.user.isClient() || this.refs.has(message.user.username);
  }

  getGameInviteLink() {
    const gameId = Number(this.channel.topic.split('#')[1]);
    return `Join your game here: [osump://${gameId}/ ${this.lobbyName}]`;
  }
}

module.exports = Bot;
