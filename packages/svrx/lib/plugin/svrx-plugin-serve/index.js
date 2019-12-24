const send = require('koa-send');
const { c2k } = require('@svrx/util');
const serveIndex = require('serve-index');
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

module.exports = {
  priority: PRIORITY.SERVE,
  hooks: {
    priority: PRIORITY.SERVE,
    async onCreate({ config, router }) {
      const root = config.get('serve.base') || config.get('root');
      const index = config.get('serve.index') || 'index.html';

      addServeAction(config, router.action, { root, index });
    },

    async onRoute(ctx, next, { config }) {
      const serveConfig = config.get('serve');
      const directoryOptions = config.get('serve.directory');
      const root = config.get('serve.base') || config.get('root');
      const index = config.get('serve.index') || 'index.html';

      const serveIndexMiddleware = c2k(serveIndex(root, { icons: true }), {
        bubble: true,
      });

      await next();

      if (isFound(ctx) || serveConfig === false) return null;

      const isSend = await trySend({ ctx, root, index });

      if (!isSend && directoryOptions !== false) {
        return serveIndexMiddleware(ctx, () => null);
      }
      return null;
    },
  },
};
