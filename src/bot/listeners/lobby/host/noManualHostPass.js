class NoManualHostPassListener {
    constructor(currentHost, bot) {
        this.currentHost = currentHost;
        this.bot = bot;
    }

    /**
     * Thanks goes to https://github.com/Xynt for this implementation.
     */
    listener() {
        let correctHost = this.playerQueue.queue[0];
        let correctNextHost = this.playerQueue.queue[1];

        if (this.currentHost.user.id !== correctNextHost.lobbyPlayer.user.id) {
            this.channel.lobby.setHost(correctHost.user.username);
            this.channel.sendMessage(`${correctHost.user.username}, you passed host over to ${currentHost.user.username}, but he is not the next on the list.`);
            this.channel.sendMessage(`If you want to pass on host, type !skip in chat.`);
        }
    }
}

module.exports = NoManualHostPassListener;