const { Writable } = require('stream');

class DevNull extends Writable {
  static _write(chunk, encoding, cb) {
    cb();
  }
}

module.exports = DevNull;
