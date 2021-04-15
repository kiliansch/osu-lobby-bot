/**
 * @class ChannelCommands
 */
class ChannelCommands {
  /**
   * @param {string|RegExp} regexp
   * @param {string} message
   * @param {function} callback
   */
  addCommand(regexp, message, callback) {
    const regexString = regexp instanceof RegExp ? regexp : `^(${regexp})$`;
    let r = new RegExp(regexString, 'i');
    if (r.test(message)) {
      callback(r.exec(message));
    }
  }
}

module.exports = new ChannelCommands();
