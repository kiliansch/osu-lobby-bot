const BanchoLobbyRegexes = require('bancho.js/lib/Multiplayer/BanchoLobbyRegexes')
  .regexes;
const starRating = require('@pwn_z0r/osu-sr-calculator'); // eslint-disable-line
const logger = require('../../../../logging/logger');
const Listener = require('../../listener');

/**
 * Restricted Beatmap listener
 */
class RestrictedBeatmapListener extends Listener {
  constructor(beatmap, bot, matchStarted) {
    super(bot);
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

    const channelUser = this.bot.channel.channelMembers.get(
      this.bot.playerQueue.currentHost
    );
    const beatmapURL = `[https://osu.ppy.sh/b/${this.beatmap.id} ${this.beatmap.artist} - ${this.beatmap.title} [${this.beatmap.version}]]`;
    const userURL = `(${channelUser.user.username})[https://osu.ppy.sh/u/${channelUser.user.id}]`;

    const tooLow = await this.beatmapTooLow();
    if (tooLow === true && !this.bot.allowBeatmap) {
      // Beatmap too high.

      channelUser.user.sendMessage(
        `${userURL}! Your choice, ${beatmapURL} is too low, minimum stars are ${this.bot.minStars}.`
      );
      if (!this.matchStarted)
        channelUser.user.sendMessage(
          'If you start with these settings, match will be aborted and host will be passed to the next in line.'
        );
    }

    const tooHigh = await this.beatmapTooHigh();
    if (tooHigh === true && !this.bot.allowBeatmap) {
      // Beatmap too high.
      channelUser.user.sendMessage(
        `${userURL}! Your choice, ${beatmapURL} is too high, maximum stars are ${this.bot.maxStars}.`
      );
      if (!this.matchStarted)
        channelUser.user.sendMessage(
          'If you start with these settings, match will be aborted and host will be passed to the next in line.'
        );
    }

    if ((tooLow || tooHigh) && this.matchStarted) {
      if (this.bot.allowBeatmap) {
        this.bot.allowBeatmap = false;
        return;
      }

      channelUser.user.sendMessage(`You have been warned.`);
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
      this.bot.channel
        .sendMessage('!mp settings (check lobby mods)')
        .then(() => {
          const modsMessageListener = (message) => {
            if (message.user.ircUsername !== 'BanchoBot') return;

            const result = BanchoLobbyRegexes.activeMods(message.message);
            if (
              result !== undefined &&
              this.bot.channel.lobby.mods !== null &&
              this.bot.channel.lobby.mods.find((o) => o.shortMod === 'dt') !==
                undefined
            ) {
              this.hasDT = true;
            }

            resolve();
            this.bot.client.removeListener('CM', modsMessageListener);
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
    return this.bot.minStars > 0 || this.bot.maxStars > 0;
  }

  /**
   * Check for beatmap difficulty too low
   */
  async beatmapTooLow() {
    let difficulty = this.beatmap.difficultyRating;

    if (this.hasDT) {
      try {
        const result = await starRating.calculateStarRating(this.beatmap.id, [
          'DT',
        ]);
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
        const result = await starRating.calculateStarRating(this.beatmap.id, [
          'DT',
        ]);
        difficulty = result.DT;
      } catch (error) {
        logger.error(error);
      }
    }

    return this.bot.maxStars > 0 && difficulty > maxStars;
  }
}

module.exports = RestrictedBeatmapListener;
