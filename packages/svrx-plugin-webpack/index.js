
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
// const nodeResolve = require('resolve');
const compose = require('koa-compose');
const { c2k } = require('svrx-util');
const libPath = require('path');

module.exports = {
  hooks: {
    async onCreate({
      middleware, config, logger, events,
    }) {
      // @TODO: use local webpack first
      const webpackConfig = config.get('config'); let webpack; let
        localWebpackConfig;
      const root = config.get('$.root');

      const configFile = libPath.resolve(root, config.get('file') || 'webpack.config.js');

      try {
        webpack = await new Promise((resolve, reject) => {
          nodeResolve('webpack', { basedir: root }, (err, res) => {
            if (err) return reject(err);
            resolve(require(res));
          });
        });
      } catch (e) {
        webpack = require('webpack');
        logger.warn(`load localwebpack from (${root}) failed, use webpack@${webpack.version} instead`);
      }

      try {
        localWebpackConfig = require(configFile);
      } catch (e) {
        logger.error(`load config file failed at ${configFile}\n${e.stack}`);
        process.exit(0);
      }

      if (typeof localWebpackConfig === 'function') {
        localWebpackConfig = localWebpackConfig('', { mode: 'development' });
      }
      prepareConfig(localWebpackConfig);

      const compiler = webpack(
        prepareConfig(localWebpackConfig),
      );

      // process local webpack config

      const oldCompilerWatch = compiler.watch.bind(compiler);
      const dataToBeRecycle = {
        watchers: [],
        modules: [],
      };

      compiler.watch = (opt, handler) => {
        const newHandler = (err, stats) => {
          if (err) return logger.error(err.message);
          dataToBeRecycle.stats = stats;
          dataToBeRecycle.modules = stats
            .toJson()
            .modules.map(m => m.id)
            .filter(id => typeof id === 'string' && id.indexOf('node_modules') === -1)
            .map(normalizeResource.bind(null, compiler.context));

          return handler(err, stats);
        };
        const watcher = oldCompilerWatch(opt, newHandler);
        dataToBeRecycle.watchers.push(watcher);
        return watcher;
      };

      logger.notify('webpack is initializing...');

      const hotReloadMiddleware = compose([
        c2k(webpackDevMiddleware(compiler, {
          logLevel: 'warn',
        }), { bubble: true }),
        c2k(webpackHotMiddleware(compiler, {

        })),
      ]);

      middleware.add('webpack-hot-reload', {
        onCreate: () => async (ctx, next) => hotReloadMiddleware(ctx, next),

      });

      events.on('file:change', (evt) => {
        const path = evt.payload.path;
        // means it is a webpack resource
        if (dataToBeRecycle.modules.indexOf(path) !== -1) {
          evt.stop();
        }
      });

      await new Promise((resolve) => {
        compiler.hooks.done.tap('SvrxWebpackDevMiddleware', () => {
          resolve();
        });
      });

      // destory logic
      return async () => {
        const p = Promise.all(watchers.map(closeWatcher));
        dataToBeRecycle = {};
        return p;
      };
    },
  },
};


function prepareConfig(config) {
  if (!config.mode) config.mode = 'development';
  return config;
}

function closeWatcher(watcher) {
  return new Promise((resolve) => {
    watcher.close(resolve);
  });
}

function normalizeResource(root, path) {
  return libPath.resolve(root, path);
}
