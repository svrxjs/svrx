const Configure = require('../configure');
const { PRIORITY } = require('../constant');
const compose = require('../util/compose');
const cache = require('../shared/cache');

const MIDDLEWARE_CACHE = Symbol('middleware');
const COMPOSE_KEY = Symbol('compose_key');
const MAX_LIMIT_MIDDLEWARES = 200;

class MiddlewareManager {
  constructor(config) {
    this.config = config || new Configure();
    this[MIDDLEWARE_CACHE] = cache({
      limit: MAX_LIMIT_MIDDLEWARES,
      onError() {
        throw Error('max middleware size limit exceeded');
      },
    });
    const basicMiddlewares = this.config.get('middlewares');
    if (basicMiddlewares) {
      for (const i in basicMiddlewares) {
        this.add(i, basicMiddlewares[i]);
      }
    }

    this.add('$ctx', {
      priority: Infinity,
      onCreate: () => async (ctx, next) => {
        ctx._svrx = {};
        await next();
      },
    });
  }

  add(name, def) {
    if (typeof def === 'function') {
      def = {
        onCreate: def,
      };
    }
    if (!def.priority) def.priority = PRIORITY.DEFAULT;

    const cache = this[MIDDLEWARE_CACHE];
    cache.set(name, def);
  }

  del(name) {
    const cache = this[MIDDLEWARE_CACHE];
    cache.del(name);
  }

  middleware() {
    return async (ctx, next) => {
      if (!this[COMPOSE_KEY]) this._composeMiddlewares();
      return this[COMPOSE_KEY].call(ctx, ctx, next);
    };
  }

  _getSortedKeys(){
    const cache = this[MIDDLEWARE_CACHE];
    const keys = cache.keys();
    keys.sort((a, b) => (cache.get(b).priority || PRIORITY.DEFAULT) - (cache.get(a).priority || PRIORITY.DEFAULT))
    return keys;
  }

  _getSortedMiddlewares(){
    const cache = this[MIDDLEWARE_CACHE];
    const keys = this._getSortedKeys();
    return {
      keys,
      middlewares:keys.map(key=>cache.get(key))
    }
  }

  _composeMiddlewares() {
    const {middlewares, keys} = this._getSortedMiddlewares()

    this[COMPOSE_KEY] = compose(middlewares.map(m => m.onCreate()), keys);
  }
}

module.exports = MiddlewareManager;
