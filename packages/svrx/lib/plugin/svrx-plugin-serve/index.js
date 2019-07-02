const send = require('koa-send');
const { c2k } = require('svrx-util');
const serveIndex = require('serve-index');
const historyApiFallback = require('koa-history-api-fallback');

const { PRIORITY } = require('../../constant');

const ACCEPT_METHOD = /^(?:GET|HEAD)$/i;

const pathToRegexp = require('path-to-regexp');

module.exports = {
  priority: PRIORITY.SERVE,
  actions: {
    serve: (payload) => {
      if (typeof payload === 'string') payload = { target: payload };

      return async (ctx, next) => {
        const target = pathToRegexp.compile(payload.target)(ctx.params);

        console.log(target, ctx.path);

        try {
          await send(ctx, ctx.path, {
            root: target,
            gzip: false,
          });
        } catch (err) {
          if (err.status !== 404) {
            throw err;
          }
        }
      };
    },
  },
  hooks: {
    async onCreate({ middleware, config, api }) {
      // serve index
      const directoryOptions = config.get('serve.directory');
      // undefined = true
      if (directoryOptions !== false) {
        const serveIndexMiddleware = c2k(serveIndex(config.get('root'), { icons: true }), { bubble: true });

        middleware.add('$serve-index', {
          priority: PRIORITY.SERVE - 1,
          onCreate: () => async (ctx, next) => {
            if (!ACCEPT_METHOD.test(ctx.method) || ctx.status !== 404 || ctx.body != null) {
              return next();
            }
            return serveIndexMiddleware(ctx, next);
          },
        });
      }

      // historyApiFallback
      // todo move out of serve
      const historyApiFallbackOptions = config.get('historyApiFallback');
      if (historyApiFallbackOptions) {
        const historyApiFallbackMiddleware = historyApiFallback(
          historyApiFallbackOptions === true ? {} : historyApiFallbackOptions,
        );
        middleware.add('$serve-history-api-fallback', {
          priority: PRIORITY.HISTORY_API_FALLBACK,
          onCreate: () => async (ctx, next) => {
            if (ctx.status !== 404) {
              return next();
            }
            return historyApiFallbackMiddleware(ctx, next);
          },
        });
      }
    },

    async onRoute(ctx, next, { config }) {
      await next();

      const serveConfig = config.get('serve');
      const root = config.get('serve.base') || config.get('root');
      const indexFileName = config.get('serve.index') || 'index.html';

      if (serveConfig === false) return;

      try {
        await send(ctx, ctx.path, {
          root,
          index: indexFileName,
          gzip: false,
        });
      } catch (err) {
        if (err.status !== 404) {
          throw err;
        }
      }
    },
  },
};
