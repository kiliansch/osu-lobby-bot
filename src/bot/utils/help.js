/**
 * Help class to display all available commands to user.
 */
class Help {
  constructor() {
    this.commands = [];
    this.inactiveCommands = [];
    this.adminCommands = [];

    this.setupCommands();
    this.setupAdminCommands();
  }

  setupCommands() {
    this.commands.push({
      command: '!skipMe',
      description:
        'Will skip your next turn and put you back to the end of the host queue.',
    });
    this.commands.push({
      command: '!timeLeft',
      description: 'Will display the time left until next round starts.',
    });
    this.inactiveCommands.push({
      command: '!new',
      description: 'Will start the process of creating a new managed lobby.',
    });
  }

  setupAdminCommands() {
    this.adminCommands.push({
      command: '!allow',
      description: 'Will disable beatmap restriction for upcoming round.',
    });
    this.adminCommands.push({
      command: '!skipTo {playerName}',
      description:
        'Will skip the queue to given player name. All skipped players will be put to the end of queue as if they had been host already.',
    });
  }

  getCommands(admin = false) {
    const output = [];
    output.push('Basic commands:');
    Object.keys(this.commands).forEach((key) => {
      output.push(
        `${this.commands[key].command}: ${this.commands[key].description}`
      );
    });

    if (admin) {
      output.push('-');
      output.push('Admin commands:');
      Object.keys(this.adminCommands).forEach((key) => {
        output.push(
          `${this.adminCommands[key].command}: ${this.adminCommands[key].description}`
        );
      });
    }

    return output;
  }
}

module.exports = new Help();
