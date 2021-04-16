const Listener = require('../../listener');

class NewPlayerListener extends Listener {
  constructor(playerObject, bot) {
    super(bot);
    this.playerObject = playerObject;
  }
  listener() {
    this.bot.playerQueue.add(
      this.playerObject.player.user.username,
      this.playerObject.player
    );
  }
}

module.exports = NewPlayerListener;
