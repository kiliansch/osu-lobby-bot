#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const shelljs = require("shelljs");
const { BanchoLobbyTeamModes } = require("bancho.js");

/**
 * 
 */
class CliHandler {
    async run() {
        // Show intro
        this.intro();
        // Gather data
        return this.getUserInput();
    }

    /**
     * Intro message
     */
    intro() {
        console.log(chalk.green(figlet.textSync("osu! lobby bot", {
            font: "standard"
        })));
    }

    /**
     * @returns {object} - Keys and values of requested user input
     */
    async getUserInput() {
        let questions = [];

        // LOBBY NAME
        questions.push({
            name: "lobbyName",
            type: "input",
            message: "Please enter your lobby name",
            filter: input => {
                return input.toString().trim()
            }
        });

        // TEAMMODE
        questions.push({
            name: "teamMode",
            type: "list",
            message: "Please select the team type",
            choices: ["HeadToHead", "TagCoop", "TeamVs", "TagTeamVs"],
            filter: value => BanchoLobbyTeamModes[value]
        });

        // LOBBY SIZE
        questions.push({
            name: "size",
            type: "number",
            message: "Please enter the lobby size between 1 and 16",
            validate: input => {
                if (input < 1 || input > 16) {
                    return "Only numbers between 1 and 16 are allowed";
                }
                 
                return true;
            },
            filter: input => {
                if (Number.isNaN(input) || input < 1 || input > 16) {
                    return  '';
                }

                return Number(input);
            }
        });

        // MODS
        questions.push({
            name: "mods",
            type: "checkbox",
            message: "Please select mods, if none are selected or Freemod is enabled all other options will be ignored",
            choices: ["Freemod", "EZ", "NF", "HT", "HR", "SD", "DT", "HD", "FL", "RL", "AP", "SO"],
            filter: (input) => {
                if (input.length === 0 || input.indexOf("Freemod") > -1) {
                    return ["Freemod"];
                }

                return input;
            }
        });

        // MIN STARS
        questions.push({
            name: "minStars",
            type: "number",
            message: "Please enter the minimum allowed stars, if there shall be no restriction, leave empty or enter 0",
            default: 0,
            filter: input => {
                if (Number.isNaN(input) || input < 0) {
                    return 0;
                }

                return Number(input);
            }
        });

        // MIN STARS
        questions.push({
            name: "maxStars",
            type: "number",
            message: "Please enter the maximum allowed stars, if there shall be no restriction, leave empty or enter 0",
            default: 0,
            filter: input => {
                if (Number.isNaN(input) || input < 0) {
                    return 0;
                }

                return Number(input);
            },
            validate: (input, answers) => {
                if (input < answers.minStars) {
                    return "Maximum stars has to be the same or higher than minimum stars"
                }

                return true;
            }
        });

        return await inquirer.prompt(questions);
    }
}

module.exports = CliHandler;