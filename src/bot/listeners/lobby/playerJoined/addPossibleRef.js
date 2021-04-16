const Listener = require('../../listener');

class AddPossibleRefListener extends Listener {
  constructor(playerObject, bot) {
    super(bot);
    this.playerObject = playerObject;
  }

  listener() {
    const creatorUsername = this.bot.creator.ircUsername;

    if (
      !this.bot.refs.has(creatorUsername) &&
      creatorUsername !== this.bot.client.getSelf().ircUsername
    ) {
      const addCreatorAsRefEvent = () => {
        const playerUsername = this.playerObj.player.user.username;
        if (playerUsername === creatorUsername) {
          this.bot.channel.lobby.addRef(playerUsername);
          this.bot.channel.lobby.removeListener(
            'playerJoined',
            addCreatorAsRefEvent
          );
        }
      };

      bot.channel.lobby.on('playerJoined', addCreatorAsRefEvent);
    }
  }
}

module.exports = AddPossibleRefListener;
