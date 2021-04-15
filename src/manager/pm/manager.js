const Bancho = require('bancho.js');
const Questionnaire = require('../questionnaire');
const Bot = require('../../bot/bot');
const logger = require('../../logging/logger');

/**
 * @class Manager - Manages incoming private messages and stars a bot after gathering all data.
 */
class Manager {
  /**
   *
   * @param {BanchoClient} Client
   */
  constructor(Client) {
    this.client = Client;
    this.runningQuestionnaires = [];
    this.runningGames = [];
  }

  async start() {
    await this.client.connect();
    logger.info('connected');

    this.client.on('PM', (message) => {
      if (
        message.user.ircUsername === 'BanchoBot' ||
        message.self ||
        message.user.isClient()
      ) {
        logger.info(
          `Blocked private message => ${message.user.ircUsername}: ${message.message}`
        );
        return;
      }

      this.handleQuestionnaire(message);
    });
  }

  /**
   *
   * @param {BanchoMessage} message
   * @returns
   */
  async handleQuestionnaire(message) {
    const running = this.runningQuestionnaires.find(
      (o) => o.name === message.user.username
    );
    if (running) {
      running.questionnaire.handleInput(message.message);
      return;
    }

    const r = /^!new$/i;
    if (r.test(message.message)) {
      if (this.runningGames.find((o) => o.name === message.user.username)) {
        message.user.sendMessage('You already have a game running.');
        return;
      }

      const questionnaire = new Questionnaire(this, message);
      this.runningQuestionnaires.push({
        name: message.user.username,
        questionnaire,
      });

      questionnaire.ask();
    }
  }

  /**
   *
   * @param {Questionnaire} questionnaire
   */
  evaluateQuestionnaire(questionnaire) {
    // Remove questionnaire from running questionnaires array
    // eslint-disable-next-line
    this.runningQuestionnaires = this.runningQuestionnaires.filter(
      (running) => questionnaire.message.user.username !== running.name
    );

    const { answers } = questionnaire;

    if (answers.confirmation === '!cancel') {
      questionnaire.message.user.sendMessage('Match creation cancelled.');
      return;
    }

    (() => {
      // Add bot instance to running games
      // Set creator as ref on joining
      // Enable admin commands for refs
      // Send invite link to creator

      // Use new client to not have the listeners of this client
      const Client = new Bancho.BanchoClient({
        username: process.env.OSU_USER,
        password: process.env.OSU_PASS,
        apiKey: process.env.API_KEY,
      });

      const defaultOptions = {
        teamMode: 0,
        mods: ['Freemod'],
      };
      Object.assign(answers, defaultOptions);

      const bot = new Bot(Client, answers);
      bot.lobbyListenersCallback = () => {
        const addCreatorAsRefEvent = (playerObj) => {
          let username = questionnaire.message.user.ircUsername;
          if (questionnaire.message.user.username !== undefined) {
            username = questionnaire.message.user.username;
          }

          if (playerObj.player.user.username === username) {
            bot.channel.lobby.addRef(playerObj.player.user.username);
            bot.channel.lobby.removeListener(
              'playerJoined',
              addCreatorAsRefEvent
            );
          }
        };

        bot.channel.lobby.on('playerJoined', addCreatorAsRefEvent);
      };

      bot.on('started', () => {
        bot.channel.on('PART', (member) => {
          // The lobby has been disbanded
          if (member.user.isClient()) {
            bot.stop();
            this.runningGames = this.runningGames.filter(
              (o) => o.username === member.user.ircUsername
            );
          }
        });
      });

      bot.start();

      this.runningGames.push({
        username: questionnaire.message.user.username,
        bot,
      });

      // since we're not caring about the promises resolving,
      // we wait till the lobby is created with a timeout
      const inviteLinkInterval = setInterval(() => {
        if (
          bot.channel !== null &&
          Object.prototype.hasOwnProperty.call(bot, 'joined') &&
          bot.channel.joined
        ) {
          questionnaire.message.user.sendMessage(bot.getGameInviteLink());

          clearInterval(inviteLinkInterval);
        }
      }, 1000);
    })();
  }
}

module.exports = Manager;
