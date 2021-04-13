const ConnectionStatus = require('./enums/connectionStatus');
const { EventEmitter } = require('events');
const Help = require('./utils/help');
const listeners = require('./listeners');
const logger = require('../logging/logger');
const PlayerQueue = require('./utils/playerQueue');

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
      logger.info('FIRED STARTING EVENT');
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
      logger.info('FIRED STARTED EVENT');

      this.setupLobbyListeners();
      this.setupClientListeners();
      this.playerQueue = new PlayerQueue(this);

      logger.info(`Multiplayer Link: https://osu.ppy.sh/mp/${this.channel.lobby.id}`);
    } catch (error) {
      this.emit('error', error);
      logger.info('FIRED ERROR EVENT');
      this.connectionStatus = ConnectionStatus.ERROR;
      logger.error('Error starting bot', error);
      process.exit(1);
    }
  }

  async stop() {
    if (this.channel.joined) {
      await this.channel.lobby.closeLobby();
    }

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
      this.emit('playerQueue', this.playerQueue.queue.length);
      logger.info('FIRED PLAYERQUEUE JOINED EVENT');
    });

    this.channel.lobby.on('playerLeft', (obj) => {
      this.playerQueue.remove(obj.user.username);
      this.emit('playerQueue', this.playerQueue.queue.length);
      logger.info('FIRED PLAYERQUEUE LEFT EVENT');
    });

    this.channel.lobby.on('matchFinished', () => {
      this.emit('matchFinished');
      this.playerQueue.moveCurrentHostToEnd();
      this.playerQueue.next();
      this.emit('host', this.playerQueue.currentHost);
      logger.info('FIRED HOST UPDATE EVENT');
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
      logger.info('SIGINT received. Closing lobby and exiting...');
      this.stop();
      process.exit(0);
    });

    if (typeof this.lobbyListenersCallback === 'function') {
      this.lobbyListenersCallback();
    }
  }

  setupClientListeners() {
    // Admin / Operator commands
    this.client.on('CM', (message) => {
      if (!message.user.isClient() || !this.refs.includes(message.user.username)) {
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
      let r = /^!skipMe$/i;
      if (r.test(message.message)) {
        this.playerQueue.skipTurn(message.user.username);
      }

      r = /^!botHelp$/i;
      if (r.test(message.message)) {
        let admin = false;
        if (message.user.isClient() || this.refs.includes(message.user.username)) {
          admin = true;
        }

        const helpLines = Help.getCommands(admin);
        Object.keys(helpLines).forEach((key) => message.user.sendMessage(helpLines[key]));
      }
    });
  }
}

module.exports = Bot;
