const Timer = require('../../../utils/timer');
const Listener = require('../../listener');

class RoundStartTimerListener extends Listener {
  listener() {
    const currentHostUser = this.bot.playerQueue.currentHostLobbyPlayer.user;

    const roundTimer = new Timer('roundTimer', 120);
    roundTimer.on('tick', (data) => {
      if ([10, 5, 3, 2, 1].indexOf(data.timeLeft) > -1) {
        this.bot.channel.sendMessage(
          `Starting game in ${data.timeLeft} seconds`
        );
      }
    });
    roundTimer.on('elapsed', () => {
      this.bot.channel.sendMessage('!mp start');
    });

    this.bot.channel.sendMessage(
      'Starting game queued in 120 seconds. Host has 60 seconds to choose a map before being skipped.'
    );
    roundTimer.start();
    this.bot.matchTimer = roundTimer;

    const afkTimer = new Timer('afkTimer', 60);
    afkTimer.on('tick', async (data) => {
      if (data.timeLeft === 30) {
        const stats = await currentHostUser.stats();
        if (stats.status === 'Afk') {
          this.next('Host skipped because of Afk status');
          afkTimer.stop();
          roundTimer.stop();
          this.listener();
        }

        currentHostUser.sendMessage(this.nextInLineMessage(30));
      }

      if (data.timeLeft === 10) {
        currentHostUser.sendMessage(this.nextInLineMessage(10));
      }
    });

    afkTimer.on('elapsed', () => {
      this.bot.playerQueue.next(
        'No beatmap change after 60 seconds, next hosts turn'
      );

      roundTimer.stop();
      this.listener();
    });
    currentHostUser.sendMessage(this.nextInLineMessage(60));
    afkTimer.start();

    this.bot.afkTimer = afkTimer;
  }

  /**
   *
   * @param {number} seconds
   * @returns
   */
  nextInLineMessage(seconds) {
    return `You have ${seconds} seconds to choose a beatmap before host will be passed to the next in line.`;
  }
}

module.exports = RoundStartTimerListener;
