const RestrictedBeatmapListener = require('./lobby/beatmap/restrictedBeatmap')
const NoManualHostPassListener = require('./lobby/host/noManualHostPass')

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
        playerLeft: [],
        host: [
            NoManualHostPassListener
        ]
    }
};

module.exports = listeners;