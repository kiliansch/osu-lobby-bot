const Questionnaire = require('../questionnaire');
const Bot = require('../../bot/bot');

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
        console.log('connected');

        this.client.on('PM', (message) => {
            if (message.user.username === 'BanchoBot' || message.self || message.user.isClient()) {
                console.log('Blocked message.');
                return;
            }

            const runningQuestionnaire = this.runningQuestionnaires.find((o) => o.name === message.user.username);
            if (runningQuestionnaire) {
                runningQuestionnaire.questionnaire.handleInput(message.message);
                return;
            }

            const runningGame = this.runningGames.find((o) => o.name === message.user.username);
            if (runningGame) {
                message.user.sendMessage('You already have a game running.');
                return;
            }

            const r = /^!new$/i;
            if (r.test(message.message)) {
                const questionnaire = new Questionnaire(this, message);
                this.runningQuestionnaires.push({
                    name: message.user.username,
                    questionnaire,
                });

                questionnaire.ask();
            }
        });
    }

    /**
     * 
     * @param {Questionnaire} questionnaire 
     */
    evaluateQuestionnaire(questionnaire) {
        this.runningQuestionnaires = this.runningQuestionnaires.filter((running) => questionnaire.message.user.username !== running.name);
        let answers = questionnaire.answers;

        console.log(answers);
        (() => {
            let bot = new Bot(this.client, answers.lobbyName, 0, answers.size, ["Freemod"], answers.minStars, answers.maxStars);
            bot.start();
        })();
    }
}

module.exports = Manager;