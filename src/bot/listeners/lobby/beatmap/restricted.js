const { EventEmitter } = require("events").EventEmitter;

/**
 * Restricted Beatmap listener
 */
class RestrictedBeatmapListener {
    constructor(beatmap, bot) {
        this.beatmap = beatmap;
        this.bot = bot;
    }

    listener() {
        if (this.beatmap == null || !this._beatmapDifficultyRestricted()) {
            return;
        }

        if (this._beatmapTooLow()) {
            // Beatmap too low.
            this.bot.channel.sendMessage(`${this.bot.playerQueue.currentHost} this beatmap is too low, minimum stars are ${this.bot.minStars}. ` +
                         "If you start with these settings, match will be aborted and host will be passed to the next in line.");
        }

        if (this._beatmapTooHigh()) {
            // Beatmap too high.
            this.bot.channel.sendMessage(`${this.bot.playerQueue.currentHost} this beatmap is too high, maximum stars are ${this.bot.maxStars}. ` +
                         "If you start with these settings, match will be aborted and host will be passed to the next in line.");
        }
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
    _beatmapTooLow() {
        return this.bot.minStars > 0 && this.beatmap.difficultyRating < this.bot.minStars;
    }

    /**
     * Check for beatmap difficulty too high
     */
    _beatmapTooHigh() {
        return this.bot.maxStars > 0 && this.beatmap.difficultyRating > this.bot.maxStars;
    }
}

module.exports = RestrictedBeatmapListener;