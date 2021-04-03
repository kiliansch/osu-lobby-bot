const { EventEmitter } = require('events');
const listeners = require('./listeners');
const PlayerQueue = require('./utils/playerQueue');
const Help = require('./utils/help');
const logger = require('../logging/logger');

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
    Object.assign(options, defaultOptions);

    /**
     * @type {BanchoClient}
     */
    this.client = Client;

    this.lobbyName = options.lobbyName;
    this.teamMode = options.teamMode;
    this.size = options.size;
    this.mods = options.mods;

    this.channel = null;
    this.playerQueue = null;
    this.gameId = null;
    this.lobbyListenersCallback = null;

    this.allowBeatmap = false;
    this.fixedHost = false;
    this.refs = [];
  }

  /**
   * Start the bot to a given game id, initialize players and setup listeners
   */
  async start() {
    try {
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

      this.setupLobbyListeners();
      this.setupClientListeners();
      this.playerQueue = new PlayerQueue(this);

      logger.info(`Multiplayer Link: https://osu.ppy.sh/mp/${this.channel.lobby.id}`);
    } catch (error) {
      logger.error('Error starting bot', error);
      process.exit(1);
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
      this.playerQueue.moveCurrentHostToEnd();
      this.playerQueue.next();
    });

    this.channel.lobby.on('matchStarted', async () => {
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

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Closing lobby and exiting...');

      if (this.channel.joined) {
        await this.channel.lobby.closeLobby();
      }

      this.client.disconnect();

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
