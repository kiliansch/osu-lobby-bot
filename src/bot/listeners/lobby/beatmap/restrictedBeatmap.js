const Regexes = require('bancho.js/lib/Multiplayer/BanchoLobbyRegexes');
const starRating = require('osu-sr-calculator');
const logger = require('../../../../logging/logger');

/**
 * Restricted Beatmap listener
 */
class RestrictedBeatmapListener {
    constructor(beatmap, bot, matchStarted) {
        this.beatmap = beatmap;
        this.bot = bot;
        this.hasDT = false;
        this.matchStarted = false;
        if (matchStarted !== undefined) {
            this.matchStarted = true;
        }
    }

    async listener() {
        if (this.beatmap == null || !this.beatmapDifficultyRestricted()) {
            return;
        }

        await this.checkForDoubleTime();

        const tooLow = await this.beatmapTooLow();
        if (tooLow === true && !this.bot.allowBeatmap) {
            // Beatmap too high.
            let message = `${this.bot.playerQueue.currentHost} this beatmap is too low, minimum stars are ${this.bot.minStars}. `;
            if (!this.matchStarted) {
                message += 'If you start with these settings, match will be aborted and host will be passed to the next in line.';
            }

            this.bot.channel.sendMessage(message);
        }

        const tooHigh = await this.beatmapTooHigh();
        if (tooHigh === true && !this.bot.allowBeatmap) {
            // Beatmap too high.
            let message = `${this.bot.playerQueue.currentHost} this beatmap is too high, maximum stars are ${this.bot.maxStars}. `;
            if (!this.matchStarted) {
                message += 'If you start with these settings, match will be aborted and host will be passed to the next in line.';
            }

            this.bot.channel.sendMessage(message);
        }

        if ((tooLow || tooHigh) && this.matchStarted) {
            if (this.bot.allowBeatmap) {
                this.bot.allowBeatmap = false;
                return;
            }

            this.bot.channel.sendMessage(`${this.bot.playerQueue.currentHost} you have been warned.`);
            this.bot.channel.lobby.abortMatch();
            this.bot.playerQueue.next();
        }
    }

    /**
     *
     * @returns {Promise<null>}
     */
    checkForDoubleTime() {
        return new Promise((resolve, reject) => {
            this.bot.channel.sendMessage('!mp settings (check lobby mods)')
                .then(() => {
                    const modsMessageListener = (message) => {
                        if (message.user.ircUsername !== 'BanchoBot') {
                            return;
                        }

                        const result = Regexes.regexes.activeMods(message.message);
                        if (result !== undefined) {
                            if (this.bot.channel.lobby.mods !== null && this.bot.channel.lobby.mods.find((o) => o.shortMod === 'dt') !== undefined) {
                                this.hasDT = true;
                            }

                            resolve();
                            this.bot.client.removeListener('CM', modsMessageListener);
                        }
                    };

                    this.bot.client.on('CM', modsMessageListener);
                })
                .catch(reject);
        });
    }

    /**
     * Getter for beatmap difficulty restriction
     */
    beatmapDifficultyRestricted() {
        return (this.bot.minStars > 0 || this.bot.maxStars > 0);
    }

    /**
     * Check for beatmap difficulty too low
     */
    async beatmapTooLow() {
        let difficulty = this.beatmap.difficultyRating;

        if (this.hasDT) {
            try {
                const result = await starRating.calculateStarRating(this.beatmap.id, ['DT']);
                difficulty = result.DT;
            } catch (error) {
                logger.error(error);
            }
        }

        return this.bot.minStars > 0 && difficulty < this.bot.minStars;
    }

    /**
     * Check for beatmap difficulty too high
     */
    async beatmapTooHigh() {
        let difficulty = this.beatmap.difficultyRating;
        const maxStars = Math.round((this.bot.maxStars + Number.EPSILON) * 10) / 10;

        if (this.hasDT) {
            try {
                const result = await starRating.calculateStarRating(this.beatmap.id, ['DT']);
                difficulty = result.DT;
            } catch (error) {
                logger.error(error);
            }
        }

        return this.bot.maxStars > 0 && difficulty > maxStars;
    }
}

module.exports = RestrictedBeatmapListener;
