const Configure = require('../configure');
const { PRIORITY } = require('../constant');
const compose = require('../util/compose');
const limitCache = require('../shared/cache');
const { isFn } = require('../util/helper');

const MIDDLEWARE_CACHE = Symbol('middleware');
const COMPOSE_KEY = Symbol('compose_key');
const MAX_LIMIT_MIDDLEWARES = 200;


function getRoute(m) {
  if (typeof m.onRoute === 'function') return m.onRoute;
  // will deprecated in future
  return m.onCreate();
}

class MiddlewareManager {
  constructor(config) {
    this.config = config || new Configure();
    this[MIDDLEWARE_CACHE] = limitCache({
      limit: MAX_LIMIT_MIDDLEWARES,
      onError() {
        throw Error('max middleware size limit exceeded');
      },
    });
    const basicMiddlewares = this.config.get('middlewares');
    if (basicMiddlewares) {
      Object.keys(basicMiddlewares).forEach((key) => {
        this.add(key, basicMiddlewares[key]);
      });
    }

    this.add('$ctx', {
      priority: Infinity,
      onRoute: async (ctx, next) => {
        ctx._svrx = {};
        await next();
      },
    });
  }

  add(name, def) {
    if (typeof def === 'function') {
      def = {
        onRoute: def,
      };
    }
    if (typeof def.priority !== 'number') def.priority = PRIORITY.DEFAULT;

    const cache = this[MIDDLEWARE_CACHE];
    if (!isFn(def.onRoute) && !isFn(def.onCreate)) {
      throw Error(`${name} should contains onRoute field`);
    }
    cache.set(name, def);
    // refresh middleware
    delete this[COMPOSE_KEY];
  }

  del(name) {
    const cache = this[MIDDLEWARE_CACHE];
    cache.del(name);
    delete this[COMPOSE_KEY];
  }

  middleware() {
    return async (ctx, next) => {
      if (!this[COMPOSE_KEY]) this._composeMiddlewares();
      return this[COMPOSE_KEY].call(ctx, ctx, next);
    };
  }

  _getSortedKeys() {
    const cache = this[MIDDLEWARE_CACHE];
    const keys = cache.keys();
    keys.sort((a, b) => {
      const bPriority = cache.get(b).priority;
      const aPriority = cache.get(a).priority;
      return bPriority - aPriority;
    });
    return keys;
  }

  _getSortedMiddlewares() {
    const cache = this[MIDDLEWARE_CACHE];
    const keys = this._getSortedKeys();
    return {
      keys,
      middlewares: keys.map((key) => cache.get(key)),
    };
  }

  _composeMiddlewares() {
    const { middlewares, keys } = this._getSortedMiddlewares();

    this[COMPOSE_KEY] = compose(middlewares.map(getRoute), keys);
  }
}

module.exports = MiddlewareManager;
