/* eslint global-require: 'off' */

const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const querystring = require('querystring');
const pluginWebpack = require('webpack');
const nodeResolve = require('resolve');
const compose = require('koa-compose');
const semver = require('semver');
const { c2k } = require('svrx-util');
const libPath = require('path');

const CLIENT_ENTRY = 'webpack-hot-middleware/client';
const NOT_VALID_VERSION = Symbol('NOT_VALID_VERSION');

function getRealClientEntry(config) {
  try {
    return nodeResolve
      .sync(CLIENT_ENTRY, { basedir: config.getInfo().path })
      .replace(/\.js$/, '');
  } catch (e) {
    // fallback to relative entry
    return CLIENT_ENTRY;
  }
}

function handleSingleEntery(entry, hotEntry) {
  if (!entry) return entry;

  if (typeof entry === 'string') {
    return [entry, hotEntry];
  }
  if (Array.isArray(entry)) {
    const hasHotEntry = entry.some((ety) => {
      if (typeof ety === 'string' && ety.indexOf(CLIENT_ENTRY) !== -1) {
        return true;
      }
      return false;
    });
    if (!hasHotEntry) entry.push(hotEntry);
    return entry;
  }
  if (typeof entry === 'object') {
    Object.keys(entry).forEach((i) => {
      entry[i] = handleSingleEntery(entry[i], hotEntry);
    });
    return entry;
  }
  return null;
}

function prepareEntry(entry, webpackConfig, config) {
  if (!config.get('hot')) {
    return entry;
  }

  const path = config.get('path');
  const clientConfig = config.get('client') || {};
  if (path) {
    clientConfig.path = path;
  }
  const realClientEntry = getRealClientEntry(config);
  const qs = querystring.encode(clientConfig);
  const hotEntry = `${realClientEntry}${qs ? `?${qs}` : ''}`;
  return handleSingleEntery(entry, hotEntry);
}

function closeWatcher(watcher) {
  return new Promise((resolve) => {
    watcher.close(resolve);
  });
}

function normalizeResource(root, path) {
  return libPath.resolve(root, path);
}

function getWebpackDependencyVersion() {
  return require('./package.json').dependencies.webpack;
}

function prepareConfig(webpackConfig, logger, webpack, config) {
  if (!webpackConfig.mode) {
    webpackConfig.mode = 'development';
  }
  if (webpackConfig.mode !== 'development') {
    logger.warn('webpack isnt running in [develoment] mode');
  }

  const plugins = webpackConfig.plugins || (webpackConfig.plugins = []);
  const { hasHMR, hasNM } = plugins.reduce((flags, p) => {
    if (p instanceof webpack.HotModuleReplacementPlugin) {
      config.set('hot', true);
      flags.hasHMR = true;
    }
    if (p instanceof webpack.NamedModulesPlugin) {
      flags.hasNM = true;
    }
    return flags;
  }, {});

  if (config.get('hot')) {
    if (!hasHMR) {
      plugins.push(new webpack.HotModuleReplacementPlugin());
    }
    if (!hasNM) {
      plugins.push(new webpack.NamedModulesPlugin());
    }
  }
  webpackConfig.entry = prepareEntry(
    webpackConfig.entry,
    webpackConfig,
    config,
  );
  return webpackConfig;
}

module.exports = {
  configSchema: {
    file: {
      type: 'string',
      description:
        'webpack config file, default using webpack.config.js in root',
    },
    hot: {
      type: 'boolean',
      default: true,
      description: 'Enable webpack Hot Module Replacement feature',
    },
    client: {
      type: 'object',
      description: 'Enable webpack Hot Module Replacement feature',
    },
    path: {
      type: 'string',
      description:
        'The path which the middleware will serve the event stream on',
    },
  },
  hooks: {
    async onCreate({
      middleware, config, logger, events,
    }) {
      // @TODO: use local webpack first

      const WEBPACK_VERSION = getWebpackDependencyVersion();
      let webpack;
      let localWebpackConfig;
      const root = config.get('$.root');

      const configFile = libPath.resolve(
        root,
        config.get('file') || 'webpack.config.js',
      );

      try {
        webpack = await new Promise((resolve, reject) => {
          nodeResolve('webpack', { basedir: root }, (err, res, pkg) => {
            if (err) return reject(err);
            if (!semver.satisfies(pkg.version, WEBPACK_VERSION)) {
              const errObj = new Error(
                `local webpack.version [${
                  pkg.version
                }] is not satisfies plugin-webpack: ${WEBPACK_VERSION}`,
              );
              errObj.code = NOT_VALID_VERSION;
              reject(errObj);
            }
            return resolve(require(res));
          });
        });
      } catch (e) {
        if (e.code === NOT_VALID_VERSION) {
          logger.error(e.message);
          return e;
        }
        webpack = pluginWebpack;
        logger.warn(
          `load localwebpack from (${root}) failed, use webpack@${
            webpack.version
          } instead`,
        );
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

      const compiler = webpack(
        prepareConfig(localWebpackConfig, logger, webpack, config),
      );

      // process local webpack config

      const oldCompilerWatch = compiler.watch.bind(compiler);
      let dataToBeRecycle = {
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
            .filter(
              id => typeof id === 'string' && id.indexOf('node_modules') === -1,
            )
            .map(normalizeResource.bind(null, compiler.context));

          return handler(err, stats);
        };
        const watcher = oldCompilerWatch(opt, newHandler);
        dataToBeRecycle.watchers.push(watcher);
        return watcher;
      };

      logger.notify('webpack is initializing...');

      let composeMiddlewares = [
        c2k(
          webpackDevMiddleware(compiler, {
            logLevel: 'warn',
          }),
          { bubble: true },
        ),
      ];
      if (config.get('hot')) {
        composeMiddlewares.push(
          c2k(
            webpackHotMiddleware(compiler, {
              path: config.get('path'),
            }),
          ),
        );
      }

      composeMiddlewares = compose(composeMiddlewares);

      middleware.add('webpack-hot-reload', {
        onCreate: () => async (ctx, next) => composeMiddlewares(ctx, next),
      });

      events.on('file:change', (payload, ctrl) => {
        const { path } = payload;
        // means it is a webpack resource
        if (config.get('hot') && dataToBeRecycle.modules.indexOf(path) !== -1) {
          ctrl.stop();
        }
      });

      await new Promise((resolve) => {
        compiler.hooks.done.tap('SvrxWebpackDevMiddleware', () => {
          resolve();
        });
      });

      // destory logic
      return async () => {
        const p = Promise.all(dataToBeRecycle.watchers.map(closeWatcher));
        dataToBeRecycle = {};
        return p;
      };
    },
  },
};

// prepare webpack config
