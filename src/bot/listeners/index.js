const ClearAfkCheckListener = require('./lobby/beatmap/clearAfkCheck');
const RestrictedBeatmapListener = require('./lobby/beatmap/restrictedBeatmap');
const NoManualHostPassListener = require('./lobby/host/noManualHostPass');
const RotateHostListener = require('./lobby/matchFinished/rotateHost');
const RoundStartTimerListener = require('./lobby/matchFinished/roundStartTimer');
const AddPossibleRefListener = require('./lobby/playerJoined/addPossibleRef');
const NewPlayerListener = require('./lobby/playerJoined/newPlayer');

const listeners = {
  client: {
    CM: {},
  },
  lobby: {
    beatmap: [RestrictedBeatmapListener, ClearAfkCheckListener],
    matchFinished: [RotateHostListener, RoundStartTimerListener],
    matchAborted: [],
    matchStarted: [RestrictedBeatmapListener],
    playerJoined: [NewPlayerListener, AddPossibleRefListener],
    playerLeft: [],
    host: [NoManualHostPassListener],
  },
};

module.exports = listeners;
