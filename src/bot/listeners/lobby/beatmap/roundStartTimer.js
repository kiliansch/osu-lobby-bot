const { Listener } = require('../../listener');

class RoundStartTimerListener extends Listener {
  listener() {
    const matchTimer = new Timer('matchTimer', 120);
    matchTimer.on('tick', (data) => {
      if ([60, 10, 5, 3, 2, 1].indexOf(data.timeLeft) > -1) {
        this.bot.channel.sendMessage(
          `Starting game in ${data.timeLeft} seconds`
        );
      }
    });
    matchTimer.on('elapsed', () => {
      this.bot.channel.sendMessage('!mp start');
    });

    this.bot.channel.sendMessage('Match will start in 120 seconds.');
    matchTimer.start();
    this.bot.matchTimer = matchTimer;
  }
}

module.exports = RoundStartTimerListener;
