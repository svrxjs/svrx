const send = require('koa-send');
const { c2k } = require('svrx-util');
const serveIndex = require('serve-index');
const historyApiFallback = require('koa-history-api-fallback');
const libPath = require('path');
const { simpleRender } = require('../../util/helper');

const { PRIORITY } = require('../../constant');

const ACCEPT_METHOD = /^(?:GET|HEAD)$/i;

async function trySend({
  ctx, path, root, index,
}) {
  try {
    await send(ctx, path || ctx.path, {
      root,
      index,
      gzip: false,
    });
    return true;
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
    return false;
  }
}

function isFound(ctx) {
  return !ACCEPT_METHOD.test(ctx.method) || ctx.status !== 404 || ctx.body != null;
}

// get('/(hello|world)').sendFile('./:path')
function addServeAction(config, action, { root }) {
  action('sendFile', (base) => {
    if (typeof base === 'string') base = { target: base };
    const { target } = base;
    const sendRoot = base.root || root;
    return async (ctx) => {
      const file = libPath.resolve(sendRoot, simpleRender(target, ctx.params));
      const path = libPath.basename(file);
      const dirname = libPath.dirname(file);

      await trySend({ ctx, path, root: dirname });
    };
  });
}

function addServeMiddleware(config, middleware, { root, index }) {
  const serveConfig = config.get('serve');
  const directoryOptions = config.get('serve.directory');

  const serveIndexMiddleware = c2k(serveIndex(root, { icons: true }), {
    bubble: true,
  });

  middleware.add('$serve', {
    priority: PRIORITY.SERVE,
    onCreate: () => async (ctx, next) => {
      await next();

      if (isFound(ctx) || serveConfig === false) return null;

      const isSend = await trySend({ ctx, root, index });

      if (!isSend && directoryOptions !== false) {
        return serveIndexMiddleware(ctx, () => null);
      }
      return null;
    },
  });
}

module.exports = {
  priority: PRIORITY.SERVE,
  hooks: {
    async onCreate({ middleware, config, router }) {
      const root = config.get('serve.base') || config.get('root');
      const index = config.get('serve.index') || 'index.html';

      addServeAction(config, router.action, { root, index });

      addServeMiddleware(config, middleware, { root, index });


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
  },
};
