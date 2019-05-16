const LEVELS = ['error', 'warn', 'info', 'verbose', 'debug'];

function write(msg, level) {
    level = level || 'info';
    process.stdout.write(`[${level.toUpperCase()}] ${new Date().toLocaleString()} - ` + msg + '\n');
}

LEVELS.forEach((level) => {
    exports[level] = function(msg) {
        write(msg, level);
    };
});

exports.log = exports.info;
