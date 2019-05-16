const chalk = require('chalk');
const LEVELS = ['error', 'warn', 'info', 'verbose', 'debug'];

function write(msg, label) {
    const labelColor = {
        error: 'Red',
        warn: 'Yellow',
        debug: 'White',
        verbose: 'White',
        info: 'Green'
    };

    label = label || 'info';

    const color = labelColor[label];
    const foreColor = color === 'White' ? 'gray' : 'white';
    const bgColor = 'bg' + color;
    const padText = '[' + label + ']';
    const labelText = color ? chalk[foreColor][bgColor](padText) : padText;

    process.stdout.write(`${labelText} ${new Date().toLocaleString()} - ` + msg + '\n');
}

LEVELS.forEach((level) => {
    exports[level] = function(msg) {
        write(msg, level);
    };
});

exports.log = exports.info;
