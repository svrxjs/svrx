const chalk = require('chalk');

const LABEL_CONFIG = {
    silent: {
        index: 101
    },
    notify: {
        index: 100,
        color: 'Blue'
    },
    error: {
        color: 'Red',
        index: 10
    },
    warn: {
        color: 'Yellow',
        index: 5
    },
    info: {
        color: 'Green',
        index: 3
    },
    debug: {
        color: 'Gray',
        index: 1
    }
};

const LEVELS = ['notify', 'error', 'warn', 'info', 'debug'];

class Logger {
    static setLevel(level) {
        if (level in LABEL_CONFIG) {
            Logger.levelIndex = LABEL_CONFIG[level].index;
        }
    }

    constructor(category = 'global') {
        this.category = category;
    }

    _write(labelText, msg) {
        process.stdout.write(`${labelText} (${new Date().toLocaleString()})  ` + msg + '\n');
    }

    write(msg, label) {
        label = label || 'info';

        if (LEVELS.indexOf(label) === -1) {
            throw Error(`logger.${label}() isn't exsits`);
        }

        const index = LABEL_CONFIG[label].index;

        if (index < Logger.levelIndex) return;

        const category = this.category;
        const color = LABEL_CONFIG[label].color;
        const foreColor = color === 'White' ? 'gray' : 'white';
        const bgColor = 'bg' + color;
        const padText = '[' + label + (category === 'global' ? '' : ` - ${category}`) + ']';
        const labelText = color ? chalk[foreColor][bgColor](padText) : padText;

        this._write(labelText, msg);
    }
}

Logger.levelIndex = 0;

LEVELS.forEach((level) => {
    Logger.prototype[level] = function(msg) {
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
