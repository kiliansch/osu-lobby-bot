# osu-autohost-bot

## API Key retrieval
You can get an API key by filling out an application form at https://osu.ppy.sh/p/api

## IRC Password
The password used to IRC is not the same you use for your account. You can request your IRC password from https://old.ppy.sh/p/irc

## Value format
### matchId
Numeric value id of the match.

### minStars and maxStars
Floating point value, `0` if no limit is wanted.

## Usage
1. Create your .env file with the contents of .env.dist. and your values.
2. Run the bot with `node index.js {matchId} {minStars} {maxStars}`


## Known Bugs
- If the host is being passed, the queue is not being updated