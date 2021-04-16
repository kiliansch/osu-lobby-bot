const Listener = require('../../listener');

class ClearAfkCheckListener extends Listener {
  constructor(beatmap, bot) {
    super(bot);
    this.beatmap = beatmap;
  }

  listener() {
    if (Boolean) {
      this.bot.afkTimer.stop();
    }
  }
}

module.exports = ClearAfkCheckListener;
