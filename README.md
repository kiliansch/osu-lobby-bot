## osu-lobby-bot
This bot is able to manage a lobby. It is mainly focussed around automatic host rotation and beatmap star difficulty restriction.
You can either run a single instance of the bot or have it be chat enabled. In chat enabled mode multiple people can send a private message with a keyword to the account the bot is running with and a process will be started asking for necessary values to create a new, managed lobby.

# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!                         IMPORTANT NOTE                         !!!
# !!!  MULTIPLAYER LOBBIES CREATED BY ONE ACCOUNT ARE LIMITED TO 4.  !!!
# !!! THIS IS A WORK IN PROGRESS. THINGS MIGHT CHANGE WITHOUT NOTICE !!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

### Commands
- !botHelp – Will display available lobby commands in a private message
- !skipMe – Will skip your next turn and put you back to the end of the host queue.
- !new – Will start the process of creating a new managed lobby.

### Admin commands
- !allow – Will disable beatmap restriction for upcoming round.
- !skipTo {playerName} – Will skip the queue to given player name. All skipped players will be put to the end of queue as if they had been host already.

### Usage

#### API Key retrieval
You can get an API key by filling out an application form at https://osu.ppy.sh/p/api/

#### IRC Username & Password
The password used to log into IRC is not the same you use for your account. You can request your IRC password from https://old.ppy.sh/p/irc

1. You have to install [nodejs](https://nodejs.org/) and [Git](https://git-scm.com/) on your computer.
2. You have to clone or download this repository.
3. You have to install `yarn` with typing `npm i -g yarn` in a terminal window.
4. You have to install all necessary packages with running `yarn` in a terminal window in this project directory.
5. You have to create a file called `.env` with the contents of `.env.dist` and your personal values after the `=`.
6. You run `node index.js` and follow the instructions to create a single game, or `node lobbyBot.js` to create your own via chat available instance for other ppl to use.
