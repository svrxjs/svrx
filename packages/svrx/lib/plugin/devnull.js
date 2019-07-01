const { Writable } = require('stream');

class DevNull extends Writable {
  _write(chunk, encoding, cb) { // eslint-disable-line
    cb();
  }
}

module.exports = DevNull;
