const Timer = require('../../../utils/timer');
const Listener = require('../../listener');

class AfkCheckListener extends Listener {
  listener() {
    const currentHostUser = this.bot.playerQueue.currentHostLobbyPlayer.user;
    const timerLength = 60;

    const afkTimer = new Timer('afkTimer', timerLength);
    afkTimer.on('tick', async (data) => {
      if (data.timeLeft === 30) {
        const stats = await currentHostUser.stats();
        if (stats.status === 'Afk') {
          this.next('Host skipped because of Afk status');
          afkTimer.stop();
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
        `No beatmap change after ${timerLength} seconds, next hosts turn`
      );

      this.listener();
    });
    currentHostUser.sendMessage(this.nextInLineMessage(timerLength));
    afkTimer.start();

    this.bot.afkTimer = afkTimer;
  }

  /**
   *
   * @param {number} seconds
   * @returns
   */
  nextInLineMessage(seconds) {
    return (
      `You have ${seconds} seconds to choose a beatmap before host will ` +
      `be passed to the next in line.`
    );
  }
}

module.exports = AfkCheckListener;
