const Questionnaire = require("../questionnaire")
const Bot = require("../../bot/bot")

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
        console.log("connected");

        this.client.on("PM", (message) => {
            if (message.user.username === "BanchoBot" || message.self || message.user.isClient()) {
                console.log("Blocked message.");
                return;
            }

            console.log("RECEIVED MESSAGE: " + message.message);

            let runningQuestionnaire = this.runningQuestionnaires.find((o) => o.name === message.user.username);
            let runningGame = this.runningGames.find((o) => o.name === message.user.username);

            if (Boolean(runningGame)) {
                message.user.sendMessage("You already have a game running.");
                return;
            }

            if (Boolean(runningQuestionnaire)) {
                runningQuestionnaire.questionnaire.handleInput(message.message);
                return;
                //message.user.sendMessage("You either already have a game running or not finished all inputs.");
            }
            
            const r = /^!start$/i;
            if (r.test(message.message)) {
                let questionnaire = new Questionnaire(this, message);
                this.runningQuestionnaires.push({
                    name: message.user.username,
                    questionnaire: questionnaire
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