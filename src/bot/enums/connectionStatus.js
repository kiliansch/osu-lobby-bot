const BotConnectionStatus = {
  CONNECTING: Symbol('CONNECTING'),
  CONNECTED: Symbol('CONNECTED'),
  DISCONNECTED: Symbol('DISCONNECTED'),
  ERROR: Symbol('ERROR'),
};

module.exports = Object.freeze(BotConnectionStatus);
