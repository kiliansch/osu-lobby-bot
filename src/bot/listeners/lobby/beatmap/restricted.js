const { EventEmitter } = require("events").EventEmitter;
const starRating = require("osu-sr-calculator");

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

    listener() {
        if (this.beatmap == null || !this._beatmapDifficultyRestricted()) {
            return;
        }
        // fetch settings to see if DT is enabled
        this.bot.channel.lobby.once("activeMods", async (mods) => {
            if (mods.mods.find((o) => o.shortMod === "dt") !== undefined) {
                this.hasDT = true;
            }

            const tooLow = await this._beatmapTooLow();
            if (tooLow == true && !this.bot.allowBeatmap) {
                // Beatmap too high.
                let message = `${this.bot.playerQueue.currentHost} this beatmap is too low, minimum stars are ${this.bot.maxminStarsStars}. `;
                if (!this.matchStarted) {
                    message += "If you start with these settings, match will be aborted and host will be passed to the next in line.";
                }

                this.bot.channel.sendMessage(message);
            }
    
            const tooHigh = await this._beatmapTooHigh();
            if (tooHigh == true && !this.bot.allowBeatmap) {
                // Beatmap too high.
                let message = `${this.bot.playerQueue.currentHost} this beatmap is too high, maximum stars are ${this.bot.maxStars}. `;
                if (!this.matchStarted) {
                    message += "If you start with these settings, match will be aborted and host will be passed to the next in line.";
                }

                this.bot.channel.sendMessage(message);
            }

            if ((tooLow || tooHigh) && this.matchStarted) {
                if (this.bot.allowBeatmap) {
                    this.bot.allowBeatmap = false;
                    return;
                }

                this.bot.channel.sendMessage(`${this.bot.playerQueue.currentHost} you have been warned.`)
                this.bot.channel.lobby.abortMatch();
                this.bot.playerQueue.next();
            }
        });
        this.bot.channel.sendMessage(`!mp settings dtCheck`);
    }

    /**
     * Getter for beatmap difficulty restriction
     */
    _beatmapDifficultyRestricted() {
        return (this.bot.minStars > 0 || this.bot.maxStars > 0);
    }

    /**
     * Check for beatmap difficulty too low
     */
    async _beatmapTooLow() {
        let difficulty = this.beatmap.difficultyRating;
        
        if (this.hasDT) {
            try {
                const result = await starRating.calculateStarRating(this.beatmap.id, ["DT"]);
                difficulty = result.DT;
            } catch (error) {
                console.error(error);
            }
        }

        return this.bot.minStars > 0 && difficulty < this.bot.minStars;
    }

    /**
     * Check for beatmap difficulty too high
     */
    async _beatmapTooHigh() {
        let difficulty = this.beatmap.difficultyRating;

        if (this.hasDT) {
            try {
                const result = await starRating.calculateStarRating(this.beatmap.id, ["DT"]);
                difficulty = result.DT;
            } catch (error) {
                console.error(error);
            }
        }

        return this.bot.maxStars > 0 && difficulty > this.bot.maxStars;
    }
}

module.exports = RestrictedBeatmapListener;