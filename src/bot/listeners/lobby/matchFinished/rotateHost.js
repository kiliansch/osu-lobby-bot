const Listener = require('../../listener');

class RotateHostListener extends Listener {
  listener() {
    this.bot.playerQueue.moveCurrentHostToEnd();
    this.bot.playerQueue.next();
  }
}

module.exports = RotateHostListener;
