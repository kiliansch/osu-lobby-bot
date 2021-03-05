const RestrictedBeatmapListener = require('./lobby/beatmap/restricted')

const listeners = {
    client: {
        CM: {}
    },
    lobby: {
        beatmap: [
            RestrictedBeatmapListener
        ],
        matchFinished: [],
        matchAborted: [],
        matchStarted: [
            RestrictedBeatmapListener
        ],
        playerJoined: [],
        playerLeft: []
    }
};

module.exports = listeners;