// @TODO Shared IO Logic between server and client
const events = require('../shared/events');
const cache = require('../shared/cache');
const logger = require('../util/logger');

const SERVICE_CACHE = Symbol('service');
const MAX_LIMIT_SERVICES = 500;

class IO {
  constructor({ server, config }) {
    this.events = events();
    const io = (this._io = require('socket.io')(server));
    io.on('connection', (socket) => {
      socket.on('$message', ({ type, payload }) => {
        this.events.emit.call(this, type, payload);
      });
      socket.on('$call', (evt) => {
        this.call(evt.serviceName, evt.payload)
          .then((data) => {
            socket.emit('$onCall', {
              callId: evt.callId,
              data,
            });
          })
          .catch((e) => {
            logger.error(e.message);
            socket.emit('$onCall', {
              callId: evt.callId,
              error: e.message || e,
            });
          });
      });
    });
    this[SERVICE_CACHE] = cache({
      limit: MAX_LIMIT_SERVICES,
      onError() {
        throw Error('max service size limit exceeded');
      },
    });
  }

  registService(name, handler) {
    this[SERVICE_CACHE].set(name, handler);
  }

  async call(name, payload) {
    const handler = this[SERVICE_CACHE].get(name);
    if (typeof handler !== 'function') {
      throw Error(`unregisted service [${name}]`);
    }
    return handler(payload);
  }

  off(...args) {
    this.events.off.apply(this, args);
  }

  on(...args) {
    this.events.on.apply(this, args);
  }

  emit(type, payload) {
    this._io.emit('$message', { type, payload });
  }
}

module.exports = IO;
