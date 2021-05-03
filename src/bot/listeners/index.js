const ClearAfkCheckListener = require('./lobby/beatmap/clearAfkCheck');
const RestrictedBeatmapListener = require('./lobby/beatmap/restrictedBeatmap');
const NoManualHostPassListener = require('./lobby/host/noManualHostPass');
const RotateHostListener = require('./lobby/matchFinished/rotateHost');
const AfkCheckListener = require('./lobby/matchFinished/afkCheck');
const AddPossibleRefListener = require('./lobby/playerJoined/addPossibleRef');
const NewPlayerListener = require('./lobby/playerJoined/newPlayer');
const RoundStartTimerListener = require('./lobby/beatmap/roundStartTimer');

const listeners = {
  client: {
    CM: {},
  },
  lobby: {
    beatmap: [
      RestrictedBeatmapListener,
      ClearAfkCheckListener,
      RoundStartTimerListener,
    ],
    matchFinished: [RotateHostListener, AfkCheckListener],
    matchAborted: [],
    matchStarted: [RestrictedBeatmapListener],
    playerJoined: [NewPlayerListener, AddPossibleRefListener],
    playerLeft: [],
    host: [NoManualHostPassListener],
  },
};

module.exports = listeners;
