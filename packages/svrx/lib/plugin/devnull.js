const { Writable } = require('stream');

class DevNull extends Writable {
    _write(chunk, encoding, cb) {
        cb();
    }
}

module.exports = DevNull;
