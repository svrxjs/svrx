const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const nodeResolve = require("resolve");
const compose = require("koa-compose");
const { c2k } = require("svrx-util");
const libPath = require("path");
const querystring = require("querystring");

const CLIENT_ENTRY = "webpack-hot-middleware/client";

module.exports = {
  configSchema: {
    file: {
      type: "string",
      description:
        'webpack"s config file, default using webpack.config.js in root'
    },
    hot: {
      type: "boolean",
      default: true,
      description: 'Enable webpack"s Hot Module Replacement feature'
    },
    client: {
      type: "object",
      description: 'Enable webpack"s Hot Module Replacement feature'
    },
    path: {
      type: "string",
      description:
        "The path which the middleware will serve the event stream on"
    }
  },
  hooks: {
    async onCreate({ middleware, config, logger, events }) {
      // @TODO: use local webpack first

      let webpack;
      let localWebpackConfig;
      const root = config.get("$.root");

      const configFile = libPath.resolve(
        root,
        config.get("file") || "webpack.config.js"
      );

      try {
        webpack = await new Promise((resolve, reject) => {
          nodeResolve("webpack", { basedir: root }, (err, res) => {
            if (err) return reject(err);
            resolve(require(res));
          });
        });
      } catch (e) {
        webpack = require("webpack");
        logger.warn(
          `load localwebpack from (${root}) failed, use webpack@${
            webpack.version
          } instead`
        );
      }

      try {
        localWebpackConfig = require(configFile);
      } catch (e) {
        logger.error(`load config file failed at ${configFile}\n${e.stack}`);
        process.exit(0);
      }

      if (typeof localWebpackConfig === "function") {
        localWebpackConfig = localWebpackConfig("", { mode: "development" });
      }

      const compiler = webpack(
        prepareConfig(localWebpackConfig, logger, webpack, config)
      );

      // process local webpack config

      const oldCompilerWatch = compiler.watch.bind(compiler);
      const dataToBeRecycle = {
        watchers: [],
        modules: []
      };

      compiler.watch = (opt, handler) => {
        const newHandler = (err, stats) => {
          if (err) return logger.error(err.message);
          dataToBeRecycle.stats = stats;
          dataToBeRecycle.modules = stats
            .toJson()
            .modules.map(m => m.id)
            .filter(
              id => typeof id === "string" && id.indexOf("node_modules") === -1
            )
            .map(normalizeResource.bind(null, compiler.context));

          return handler(err, stats);
        };
        const watcher = oldCompilerWatch(opt, newHandler);
        dataToBeRecycle.watchers.push(watcher);
        return watcher;
      };

      logger.notify("webpack is initializing...");

      let composeMiddlewares = [
        c2k(
          webpackDevMiddleware(compiler, {
            logLevel: "warn"
          }),
          { bubble: true }
        )
      ];
      if (config.get("hot")) {
        composeMiddlewares.push(
          c2k(
            webpackHotMiddleware(compiler, {
              path: config.get("path")
            })
          )
        );
      }

      composeMiddlewares = compose(composeMiddlewares);

      middleware.add("webpack-hot-reload", {
        onCreate: () => async (ctx, next) => composeMiddlewares(ctx, next)
      });

      events.on("file:change", evt => {
        const path = evt.payload.path;
        // means it is a webpack resource
        if (config.get("hot") && dataToBeRecycle.modules.indexOf(path) !== -1) {
          evt.stop();
        }
      });

      await new Promise(resolve => {
        compiler.hooks.done.tap("SvrxWebpackDevMiddleware", () => {
          resolve();
        });
      });

      // destory logic
      return async () => {
        const p = Promise.all(watchers.map(closeWatcher));
        dataToBeRecycle = {};
        return p;
      };
    }
  }
};

// prepare webpack config

function prepareConfig(webpackConfig, logger, webpack, config) {
  if (!webpackConfig.mode) {
    webpackConfig.mode = "development";
  }
  if (webpackConfig.mode !== "development") {
    logger.warn("webpack isn't running in [develoment] mode");
  }

  const plugins = webpackConfig.plugins || (webpackConfig.plugins = []);
  const { hasHMR, hasNM } = plugins.reduce((flags, p) => {
    if (p instanceof webpack.HotModuleReplacementPlugin) {
      config.set("hot", true);
      flags.hasHMR = true;
    }
    if (p instanceof webpack.NamedModulesPlugin) {
      flags.hasNM = true;
    }
    return flags;
  }, {});

  if (config.get("hot")) {
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
    config
  );
  return webpackConfig;
}

function prepareEntry(entry, webpackConfig, config) {
  if (!config.get("hot")) {
    return entry;
  }

  const path = config.get("path");
  const clientConfig = config.get("client") || {};
  if (path) {
    clientConfig.path = path;
  }
  const realClientEntry = getRealClientEntry(config);
  const qs = querystring.encode(clientConfig);
  const hotEntry = `${realClientEntry}${qs ? `?${qs}` : ""}`;
  return handleSingleEntery(entry, hotEntry);
}

function handleSingleEntery(entry, hotEntry) {
  if (!entry) return entry;

  if (typeof entry === "string") {
    return [entry, hotEntry];
  }
  if (Array.isArray(entry)) {
    const hasHotEntry = entry.some(ety => {
      if (typeof ety === "string" && ety.indexOf(CLIENT_ENTRY) !== -1) {
        return true;
      }
    });
    if (!hasHotEntry) entry.push(hotEntry);
    return entry;
  }
  if (typeof entry === "object") {
    for (const i in entry) {
      if (entry.hasOwnProperty(i)) {
        entry[i] = handleSingleEntery(entry[i], hotEntry);
      }
    }
    return entry;
  }
}

function closeWatcher(watcher) {
  return new Promise(resolve => {
    watcher.close(resolve);
  });
}

function normalizeResource(root, path) {
  return libPath.resolve(root, path);
}

function getRealClientEntry(config) {
  try {
    return nodeResolve
      .sync(CLIENT_ENTRY, { basedir: config.getInfo().path })
      .replace(/\.js$/, "");
  } catch (e) {
    // fallback to relative entry
    return CLIENT_ENTRY;
  }
}
