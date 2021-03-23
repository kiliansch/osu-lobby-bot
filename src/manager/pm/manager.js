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
        // Remove questionnaire from running questionnaires array
        this.runningQuestionnaires = this.runningQuestionnaires.filter((running) => questionnaire.message.user.username !== running.name);
        const { answers } = questionnaire;

        (() => {
            // Add bot instance to running games
            // Set creator as ref on joining
            // Enable admin commands for refs
            // Send invite link to creator

            const bot = new Bot(this.client, answers.lobbyName, 0, answers.size, ['Freemod'], answers.minStars, answers.maxStars);
            bot.lobbyListenersCallback = () => {
                bot.channel.lobby.on('playerJoined', (playerObj) => {
                    if (playerObj.player.user.username === questionnaire.message.user.username) {
                        bot.channel.lobby.setRef(playerObj.player.user.username);
                    }
                });
            };

            bot.start();

            this.runningGames.push({
                username: questionnaire.message.user.username,
                bot,
            });

            // since we're not caring about the promises resolving, we wait till the lobby is created with a timeout
            const inviteLinkTimeout = () => {
                if (bot.channel) {
                    const gameId = Number(bot.channel.topic.substring(18));
                    this.message.user.sendMessage(`Join your game here: [osump://${gameId}/ ${bot.lobbyName}]`);

                    clearTimeout(inviteLinkTimeout);
                }
            };
            setTimeout(inviteLinkTimeout, 1000);
        })();
    }
}

module.exports = Manager;
