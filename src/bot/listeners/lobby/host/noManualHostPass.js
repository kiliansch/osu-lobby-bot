class NoManualHostPassListener {
  constructor(currentHost, bot) {
    this.currentHost = currentHost;
    this.bot = bot;
  }

  /**
   * Thanks goes to https://github.com/Xynt for this implementation.
   */
  async listener() {
    // don't run if we just do normal rotation
    if (this.bot.rotationChange === true) {
      return;
    }

    const correctNextHost = this.bot.playerQueue.queue[0];
    if (
      Boolean(this.currentHost) &&
      this.bot.playerQueue.currentHost !== this.currentHost.user.username &&
      (!this.bot.rotationChange ||
        this.currentHost.user.username !== correctNextHost.lobbyPlayer.user.username)
    ) {
      // don't run this on the upcoming host change
      this.bot.rotationChange = true;

      await this.waitHostTurn(this.bot.playerQueue.currentHost);

      this.bot.channel.sendMessage(
        `${this.bot.playerQueue.currentHost}, you passed host over to ${this.currentHost.user.username}, but it's not their turn yet.`
      );
      this.bot.channel.sendMessage('If you want to pass on your turn, type !skip in chat.');
    }
  }

  waitHostTurn(playerName) {
    return new Promise((resolve, reject) => {
      this.bot.channel.lobby
        .setHost(playerName)
        .then(() => {
          const hostChangeMessageListener = (message) => {
            if (message.user.ircUsername !== 'BanchoBot') {
              return;
            }

            const r = new RegExp(`^${playerName} became the host.$`);
            if (r.test(message.message)) {
              this.bot.rotationChange = false;
              resolve();
              this.bot.client.removeListener('CM', hostChangeMessageListener);
            }
          };

          this.bot.client.on('CM', hostChangeMessageListener);
        })
        .catch(reject);
    });
  }
}

module.exports = NoManualHostPassListener;
