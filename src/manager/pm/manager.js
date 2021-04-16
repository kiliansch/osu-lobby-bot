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
   * @param {Bancho.BanchoClient} Client
   */
  constructor(Client) {
    this.client = Client;
    this.runningQuestionnaires = new Map();
    this.runningGames = new Map();
  }

  async start() {
    try {
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
    } catch (e) {
      console.error(e);
    }
  }

  /**
   *
   * @param {BanchoMessage} message
   * @returns
   */
  handleQuestionnaire(message) {
    const messageUsername = message.user.ircUsername;
    if (this.runningQuestionnaires.has(messageUsername)) {
      this.runningQuestionnaires
        .get(messageUsername)
        .questionnaire.handleInput(message.message);
      return;
    }

    const r = /^!new$/i;
    if (r.test(message.message)) {
      if (this.runningGames.has(messageUsername)) {
        message.user.sendMessage('You already have a game running.');
        return;
      }

      const questionnaire = new Questionnaire(this, message);
      this.runningQuestionnaires.set(messageUsername, { questionnaire });

      questionnaire.ask();
    }
  }

  /**
   *
   * @param {Questionnaire} questionnaire
   */
  evaluateQuestionnaire(questionnaire) {
    const creator = questionnaire.message.user;

    // Remove questionnaire from running questionnaires map
    this.runningQuestionnaires.delete(creator.ircUsername);

    const { answers } = questionnaire;

    if (answers.confirmation === '!cancel') {
      creator.sendMessage('Match creation cancelled.');
      return;
    }

    (() => {
      // Use new client to not have the listeners of this client
      const Client = new Bancho.BanchoClient({
        username: process.env.OSU_USER,
        password: process.env.OSU_PASS,
        apiKey: process.env.API_KEY,
      });

      const defaultOptions = {
        teamMode: 0,
        mods: ['Freemod'],
        creator: creator,
      };
      Object.assign(answers, defaultOptions);

      const bot = new Bot(Client, answers);
      bot.start();

      bot.on('started', () => {
        bot.channel.on('PART', (member) => {
          if (member.user.isClient)
            this.runningGames.delete(member.user.ircUsername);
        });
      });

      // Add bot instance to running games
      this.runningGames.set(creator.ircUsername, { bot });
    })();
  }
}

module.exports = Manager;
