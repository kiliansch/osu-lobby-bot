const Questionnaire = require('../questionnaire');
const Bot = require('../../bot/bot');
const Bancho = require('bancho.js');

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
            console.log("PRIVATE MESSAGE");
            if (message.user.ircUsername === 'BanchoBot' || message.self || message.user.isClient()) {
                console.log(`Blocked private message => ${message.user.ircUsername}: ${message.message}`);
                return;
            }

            this.handleQuestionnaire(message);
        });
    }

    async handleQuestionnaire(message) {
        const runningQuestionnaire = this.runningQuestionnaires.find((o) => o.name === message.user.username);
        if (runningQuestionnaire) {
            runningQuestionnaire.questionnaire.handleInput(message.message);
            return;
        }

        const runningGame = this.runningGames.find((o) => o.name === message.user.username);

        const r = /^!new$/i;
        if (r.test(message.message)) {
            if (runningGame) {
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
        this.runningQuestionnaires = this.runningQuestionnaires.filter((running) => questionnaire.message.user.username !== running.name);
        const { answers } = questionnaire;

        if (answers.confirmation === '!cancel') {
            questionnaire.message.user.sendMessage("Match creation cancelled.");
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
                apiKey: process.env.API_KEY
            });

            const bot = new Bot(Client, answers.lobbyName, 0, answers.size, ['Freemod'], answers.minStars, answers.maxStars);
            bot.lobbyListenersCallback = () => {
                bot.channel.lobby.on('playerJoined', (playerObj) => {
                    let username = questionnaire.message.user.username !== undefined ? questionnaire.message.user.username : questionnaire.message.user.ircUsername

                    console.log("PLAYER JOINED!!");
                    console.log(playerObj.player.user.username)
                    console.log(username)
                    //
                    if (playerObj.player.user.username === username) {
                        bot.channel.lobby.addRef(playerObj.player.user.username);
                    }
                });
            };

            bot.start();

            this.runningGames.push({
                username: questionnaire.message.user.username,
                bot,
            });

            // since we're not caring about the promises resolving, we wait till the lobby is created with a timeout
            let inviteLinkInterval = setInterval(() => {
                if (bot.channel !== null && bot.channel.hasOwnProperty('joined') && bot.channel.joined) {
                    const gameId = Number(bot.channel.topic.split('#')[1]);
                    questionnaire.message.user.sendMessage(`Join your game here: [osump://${gameId}/ ${bot.lobbyName}]`);

                    clearInterval(inviteLinkInterval);
                }
            }, 1000);
        })();
    }
}

module.exports = Manager;
