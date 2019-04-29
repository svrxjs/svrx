const Configure = require('../configure');
const cache = require('../util/cache');
const compose = require('koa-compose');

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
            }
        });
        const basicMiddlewares = this.config.get('middlewares');
        if (basicMiddlewares) {
            for (var i in basicMiddlewares) {
                this.add(i, basicMiddlewares[i]);
            }
        }

        this.add('$ctx', {
            priority: -Infinity,
            onCreate: () => async (ctx, next) => {
                ctx._svrx = {};
                await next();
            }
        });
        this.add('$proxy', require('./middlewares/proxy'));
        this.add('$serveStatic', require('./middlewares/serveStatic'));
    }

    add(name, def) {
        if (typeof def === 'function') {
            def = {
                onCreate: def
            };
        }

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

    _composeMiddlewares() {
        const middlewares = this[MIDDLEWARE_CACHE].values();

        middlewares.sort((a, b) => {
            return (a.priority || 10) - (b.priority || 10);
        });

        this[COMPOSE_KEY] = compose(middlewares.map((m) => m.onCreate(this.config)));
    }
}

module.exports = MiddlewareManager;
