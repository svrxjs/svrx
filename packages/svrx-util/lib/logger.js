const chalk = require('chalk');
const ora = require('ora');

const LABEL_CONFIG = {
  silent: {
    index: 101,
  },
  notify: {
    index: 100,
    text: 'svrx',
    color: 'Blue',
  },
  error: {
    color: 'Red',
    index: 10,
  },
  warn: {
    color: 'Yellow',
    index: 5,
  },
  info: {
    color: 'Green',
    index: 3,
  },
  debug: {
    color: 'Black',
    index: 1,
  },
};

const LEVELS = ['notify', 'error', 'warn', 'info', 'debug'];

const STATE = {
  LOCKED: Symbol('LOCKED'),
  UNLOCKED: Symbol('UNLOCKED'),
};

class Logger {
  static setLevel(level) {
    if (level in LABEL_CONFIG) {
      Logger.levelIndex = LABEL_CONFIG[level].index;
    }
  }

  static lock() {
    const stdout = Logger.stream;
    Logger.oldWrite = stdout._write;

    stdout._write = function (...args) {
      args[0] = '';
      return Logger.oldWrite.apply(this, args);
    };

    Logger.state = STATE.LOCKED;
  }

  static release() {
    if (Logger.state !== STATE.LOCKED) return;
    Logger.stream._write = Logger.oldWrite;
    delete Logger.oldWrite;
    Logger.state = STATE.UNLOCKED;
  }

  get chalk() {
    return chalk;
  }

  constructor(category = 'global') {
    this.category = category;
  }

  _getWriteMsg(msg, label) {
    label = label || 'notify';

    if (LEVELS.indexOf(label) === -1) {
      throw Error(`logger.${label}() isn't exsits`);
    }

    const index = LABEL_CONFIG[label].index;

    const text = LABEL_CONFIG[label].text || label;

    if (index < Logger.levelIndex) return;

    const category = this.category;
    const color = LABEL_CONFIG[label].color;
    const foreColor = color === 'White' ? 'gray' : 'white';
    const bgColor = `bg${color}`;
    const padText = `[${text}${category === 'global' ? '' : `:${category}`}]`;
    const labelText = color ? chalk[foreColor][bgColor](padText) : padText;

    return `${labelText} ${msg}\n`;
  }

  write(msg, label, options) {
    options = options || {};
    if (Logger.state === STATE.LOCKED && options.force !== true) {
      this.write('Logger is locked, some progress task need release', 'warn', { force: true });
      return;
    }

    const content = this._getWriteMsg(msg, label);

    if (content) Logger.stream.write(content);
  }

  progress(msg, label) {
    const spinner = ora(this._getWriteMsg(msg, label)).start();

    Logger.lock();

    return function () {
      Logger.release();
      spinner.stop();
    };
  }

  log(...args) {
    return this.notify.apply(this, args);
  }
}

Logger.levelIndex = 0;
Logger.state = STATE.UNLOCKED;
Logger.stream = process.stdout;

LEVELS.forEach((level) => {
  Logger.prototype[level] = function (msg) {
    this.write(msg, level);
  };
});

function getPluginLogger(name) {
  const categoryName = `plugin-${name}`;
  return new Logger(categoryName);
}

const logger = (module.exports = new Logger());

logger.setLevel = Logger.setLevel;

logger.Logger = Logger;

logger.getPluginLogger = getPluginLogger;
