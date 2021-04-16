const { EventEmitter } = require('events');

class Timer extends EventEmitter {
  /**
   * @param {string} name
   * @param {number} time
   */
  constructor(name, time = 0) {
    super();
    this.name = name;
    this.time = time;
    this.status = 'STOPPED';

    this.timer = null;
  }

  start() {
    if (this.time <= 0) return;
    this.status = 'STARTED';
    this.emit('started', { name: this.name, timerLength: this.time });
    this.timer = setInterval(() => {
      if (this.time == 0) {
        this.status = 'ELAPSED';
        this.emit('elapsed', { name: this.name });
        clearInterval(this.timer);
      }

      --this.time;
      this.emit('tick', { name: this.name, timeLeft: this.time });
    }, 1000);
  }

  stop() {
    clearInterval(this.timer);
  }
}

module.exports = Timer;
