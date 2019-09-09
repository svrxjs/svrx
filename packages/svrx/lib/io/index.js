// @TODO Shared IO Logic between server and client
const io = require('socket.io');

const { IO_PATH } = require('../shared/consts');
const { getBody } = require('../util/helper');
const events = require('../shared/events');
const cache = require('../shared/cache');

const SERVICE_CACHE = Symbol('service');
const MAX_LIMIT_SERVICES = 500;

class IO {
  constructor({ server, middleware }) {
    this.events = events();
    this._io = io(server, {
      path: IO_PATH,
    });

    // add $call middleware
    middleware.add('$call', {
      onRoute: async (ctx, next) => {
        if (ctx.path === IO_PATH) {
          let body = await getBody(ctx);
          body = JSON.parse(body.toString());
          try {
            ctx.body = await this.call(body.serviceName, body.payload);
          } catch (e) {
            ctx.status = 500;
            ctx.body = e.message;
          }
          return null;
        }
        return next();
      },
    });
    this._io.on('connection', (socket) => {
      socket.on('$message', ({ type, payload }) => {
        this.events.emit.call(this, type, payload);
      });
    });
    this[SERVICE_CACHE] = cache({
      limit: MAX_LIMIT_SERVICES,
      onError() {
        throw Error('max service size limit exceeded');
      },
    });
  }

  // deprecated
  registService(name, handler) {
    this[SERVICE_CACHE].set(name, handler);
  }

  register(name, handler) {
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
