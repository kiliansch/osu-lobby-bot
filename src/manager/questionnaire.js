const BreakException = require('../exceptions/breakException');

/**
 * Questionnaire class
 */
class Questionnaire {
  /**
   *
   * @param {Manager} manager
   * @param {BanchoMessage} message
   */
  constructor(manager, message) {
    this.manager = manager;
    this.message = message;
    this.answers = {};
    this.currentQuestion = null;
    this.setupQuestions();
  }

  /**
   * Setup questions with validation if needed
   */
  setupQuestions() {
    const questions = [];
    questions.push({
      name: 'lobbyName',
      type: 'string',
      message: 'Enter the lobby name',
    });
    questions.push({
      name: 'size',
      type: 'integer',
      message: 'Enter a lobby size between 1 and 16',
      validate: (input) => {
        const numberInput = Number(input);

        if (Number.isNaN(numberInput)) {
          return 'You gotta enter a number...';
        }

        if (numberInput < 1 || numberInput > 16) {
          return 'Only numbers between 1 and 16 are allowed';
        }

        return true;
      },
    });
    questions.push({
      name: 'minStars',
      type: 'number',
      message: 'Enter minimum stars in format 1.11, if none, just 0',
      validate: (input) => {
        const numberInput = Number(input);

        if (Number.isNaN(numberInput)) {
          return 'You gotta enter a number... Try again.';
        }

        if (numberInput < 0) {
          return "Can't be that negative :) Try again.";
        }

        return true;
      },
    });
    questions.push({
      name: 'maxStars',
      type: 'number',
      message:
        'Enter maximum stars in format 1.11, if none, just 0. Has to be higher or same as minimum stars.',
      validate: (input) => {
        const numberInput = Number(input);

        if (Number.isNaN(numberInput)) {
          return 'You gotta enter a number... Try again.';
        }

        if (numberInput < 0) {
          return "Can't be that negative :) Try again.";
        }

        if (this.answers.minStars > 0 && numberInput < this.answers.minStars) {
          return `You've set min stars of "${this.answers.minStars}". "${numberInput}" is not equal or higher. Is it? Try again.`;
        }

        return true;
      },
    });
    questions.push({
      name: 'confirmation',
      type: 'string',
      message: () => {
        const message = [
          'Type !confirm to accept or !cancel to cancel',
          `Lobby name: ${this.answers.lobbyName}`,
          `Size: ${this.answers.size}`,
          `Min Stars: ${this.answers.minStars}`,
          `Max Stars: ${this.answers.maxStars}`,
        ];

        return message;
      },
      validate: (input) => {
        if (input !== '!confirm' && input !== '!cancel') {
          return 'Only !confirm or !cancel allowed.';
        }

        return true;
      },
    });

    this.questions = questions;
  }

  /**
   * Start the questionnaire
   */
  ask() {
    try {
      Object.keys(this.questions).forEach((index) => {
        const current = this.questions[index];
        if (!Object.prototype.hasOwnProperty.call(current, 'answered')) {
          this.currentQuestion = current;
          if (typeof current.message === 'string') {
            this.message.user.sendMessage(current.message);
          }

          if (typeof current.message === 'function') {
            const messages = current.message();
            Object.keys(messages).forEach((key) =>
              this.message.user.sendMessage(messages[key])
            );
          }

          throw BreakException;
        }
      });

      this.manager.evaluateQuestionnaire(this);
    } catch (e) {
      if (e !== BreakException) throw e;
    }
  }

  /**
   *
   * @param {string} message
   */
  handleInput(message) {
    if (
      !Object.prototype.hasOwnProperty.call(this.currentQuestion, 'answered')
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          this.currentQuestion,
          'validate'
        ) &&
        this.currentQuestion.validate(message) !== true
      ) {
        this.message.user.sendMessage(this.currentQuestion.validate(message));
      } else {
        this.currentQuestion.answered = true;
        this.answers[this.currentQuestion.name] = this.formatAnswer(
          this.currentQuestion.type,
          message
        );
        this.ask();
      }
    }
  }

  formatAnswer(type, value) {
    switch (type) {
      case 'number':
      case 'integer':
        return Number(value);
      default:
        return value;
    }
  }
}

module.exports = Questionnaire;
