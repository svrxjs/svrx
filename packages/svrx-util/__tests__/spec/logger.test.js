const expect = require('expect.js');
const logger = require('../../lib/logger');

const Logger = logger.Logger;

describe('logger', () => {
  const { Writable } = require('stream');

  function log(msg, label) {
    return new Promise((resolve, reject) => {
      let cached = '';
      Logger.stream = new Writable({});
      Logger.stream._write = (chunk, encode, cb) => {
        cached += chunk.toString();
        console.log('====write', cached);
        cb();
      };

      const l = new logger.Logger();

      Logger.stream.on('finish', () => {
        Logger.stream = process.stdout;
        resolve(cached);
      });
      l[label](msg);
      Logger.stream.end();
    });
  }

  it('log function', (done) => {
    Logger.setLevel('debug');
    log('hello world', 'notify')
      .then((content) => {
        expect(content).to.match(/\[svrx\]/);
        return log('hello world', 'error');
      })
      .then((content) => {
        expect(content).to.match(/\[error\]/);
        return log('hello world', 'debug');
      })
      .then((content) => {
        expect(content).to.match(/\[debug\]/);
        return log('hello world', 'info');
      })
      .then((content) => {
        expect(content).to.match(/\[info\]/);
        return log('hello world', 'warn');
      })
      .then((content) => {
        expect(content).to.match(/\[warn\]/);
        Logger.setLevel('error');
        done();
      });
  });

  it('log level', (done) => {
    Logger.setLevel('error');
    log('hello world', 'notify')
      .then((content) => {
        expect(content).to.match(/\[svrx\]/);
        return log('hello world', 'error');
      })
      .then((content) => {
        expect(content).to.match(/\[error\]/);
        return log('hello world', 'debug');
      })
      .then((content) => {
        expect(content).to.equal('');
        return log('hello world', 'info');
      })
      .then((content) => {
        expect(content).to.equal('');
        return log('hello world', 'warn');
      })
      .then((content) => {
        expect(content).to.equal('');
        Logger.setLevel('error');
        done();
      });
  });

  it('Logger.lock', (done) => {
    Logger.lock();

    log('hello world', 'notify').then((content) => {
      expect(content).to.equal('');
      Logger.release();
      log('hello world', 'notify').then((content) => {
        expect(content).to.match(/hello world/);
        done();
      });
    });
  });
});
