const ConnectionStatus = require('./enums/connectionStatus');
const { EventEmitter } = require('events');
const Help = require('./utils/help');
const listeners = require('./listeners');
const logger = require('../logging/logger');
const PlayerQueue = require('./utils/playerQueue');
const ChannelCommands = require('./utils/channelCommands');

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
  constructor(Client, options = {}) {
    super();
    const defaultOptions = {
      minStars: 0,
      maxStars: 0,
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

    this.channel = null;
    this.playerQueue = null;
    this.gameId = null;
    this.lobbyListenersCallback = null;

    this.allowBeatmap = false;
    this.fixedHost = false;
    this.refs = [];

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
      await this.channel.lobby.setSettings(this.teamMode, 0, this.size);
      await this.channel.lobby.setMods(this.mods, this.mods.indexOf('Freemod') > -1);
      await this.channel.lobby.setPassword('');
      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.emit('started');

      this.setupLobbyListeners();
      this.setupChannelListeners();
      this.playerQueue = new PlayerQueue(this);

      logger.info(
        `Multiplayer Link: https://osu.ppy.sh/mp/${this.channel.lobby.id}`
      );
      this.client.getSelf().sendMessage(this.getGameInviteLink());
    } catch (error) {
      this.emit('error', error);
      this.connectionStatus = ConnectionStatus.ERROR;
      logger.error('Error starting bot', error);
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
      this.emit('matchFinished');
      this.playerQueue.moveCurrentHostToEnd();
      this.playerQueue.next();
    });

    this.channel.lobby.on('matchStarted', async () => {
      this.emit('matchStarted');
      listeners.lobby.matchStarted.forEach((MatchStartedListener) => {
        if (MatchStartedListener.name === 'RestrictedBeatmapListener') {
          new MatchStartedListener(this.channel.lobby.beatmap, this, true).listener();
        } else {
          new MatchStartedListener().listener();
        }
      });
    });

    this.channel.lobby.on('host', (currentHost) => {
      listeners.lobby.host.forEach((HostListener) => {
        new HostListener(currentHost, this).listener();
      });
    });

    this.channel.lobby.on('refereeAdded', (playerName) => {
      this.refs.push(playerName);
    });

    this.channel.lobby.on('refereeRemoved', (playerName) => {
      this.refs = this.refs.filter((refArrayItem) => refArrayItem !== playerName);
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

  /**
   *
   * @param {BanchoMessage} message
   * @returns {Boolean}
   */
  isMessageFromOp(message) {
    return message.user.isClient() || this.refs.includes(message.user.username);
  }

  setupChannelListeners() {
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

      ChannelCommands.addCommand('!botHelp', message.message, () => {
        const helpLines = Help.getCommands(this.isMessageFromOp(message));
        Object.keys(helpLines).forEach((key) =>
          message.user.sendMessage(helpLines[key])
        );
      });
    });
  }

  getGameInviteLink() {
    const gameId = Number(this.channel.topic.split('#')[1]);
    return `Join your game here: [osump://${gameId}/ ${this.lobbyName}]`;
  }
}

module.exports = Bot;
