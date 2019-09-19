const nodeResolve = require('resolve');
const libPath = require('path');
const chalk = require('chalk');

const { getLoader } = require('./loader');
const { ASSET_FIELDS, BUILTIN_PLUGIN } = require('../constant');
const { normalizePluginName } = require('../util/helper');
const logger = require('../util/logger');
const semver = require('../util/semver');
const { setRegistry } = require('./npm');

const PLUGIN_MAP = Symbol('PLUGIN_MAP');

class PluginSystem {
  /**
   * @param {Array} pluginlist
   */
  constructor({
    events, config, middleware, injector, io, router,
  }) {
    this.router = router;
    this.middleware = middleware;
    this.injector = injector;
    this.events = events;
    this.config = config;
    this.io = io;
    this[PLUGIN_MAP] = {};
    // regist builtin Service
    this.initService();

    // set npm registry
    const registry = config.get('registry');
    setRegistry(registry);
  }

  get(name) {
    return this[PLUGIN_MAP][name];
  }

  initService() {
    if (!this.io) return;
    const { config } = this;
    // regist initialize service
    this.io.registService('$.config', async (payload) => {
      const targetConfig = payload.scope ? config.getPlugin(payload.scope) : config;
      if (!targetConfig) throw Error(`plugin ${payload.scope} doesn't exsits`);
      return targetConfig[payload.command](...payload.params);
    });
  }

  async load(plugins) {
    const startTime = Date.now();
    if (!Array.isArray(plugins) || !plugins.length) return;
    const names = plugins
      .map((p) => p.getInfo('name'))
      .filter((name) => !BUILTIN_PLUGIN.includes(name));
    const release = logger.spin(
      `loading plugin${plugins.length > 1 ? 's' : ''} ${names.join(',')} `,
    );
    const pModules = await Promise.all(plugins.map((p) => this.loadOne(p)));

    release();

    const showNames = pModules
      .filter((p) => !BUILTIN_PLUGIN.includes(p.name))
      .map((p) => {
        if (p.version) return `${p.name}@${p.version}`;
        return p.name;
      });

    if (showNames.length) {
      logger.notify(
        `${chalk.gray(showNames.join(','))} load successfully in ${(
          (Date.now() - startTime)
          / 1000
        ).toFixed(2)}s!`,
      );
    }
  }

  async loadOne(pluginConfig) {
    const name = pluginConfig.getInfo('name');
    const version = pluginConfig.getInfo('version');
    const pluginMap = this[PLUGIN_MAP];
    const { config } = this;

    if (pluginMap[name]) return pluginMap[name];

    // load local plugin by name
    const resolveRet = await this.resolveLocalModule(name, version);

    if (resolveRet) {
      pluginMap[name] = {
        installed: true,
        name,
        path: resolveRet.path,
        module: resolveRet.module,
        version: resolveRet.pkg.version,
        pluginConfig,
      };
    } else {
      const load = getLoader(pluginConfig);

      const pluginModule = await load(pluginConfig, config);

      pluginMap[name] = pluginModule;
    }

    return pluginMap[name];
  }

  resolveLocalModule(name, version) {
    const { config } = this;
    return new Promise((resolve) => {
      const normalizedName = normalizePluginName(name);
      nodeResolve(
        normalizedName,
        {
          basedir: config.get('root'),
        },
        (err, res, pkg) => {
          if (err) {
            // suppress error
            resolve(null);
            return;
          }
          const svrxPattern = (pkg.engines && pkg.engines.svrx) || '*';
          if ((!version || version === pkg.version) && semver.satisfies(svrxPattern)) {
            resolve({
              path: libPath.join(res.split(normalizedName)[0], normalizedName),
              /* eslint-disable global-require, import/no-dynamic-require */
              module: require(res),
              pkg,
            });
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  getInstalledPluginNames() {
    return Object.keys(this[PLUGIN_MAP]);
  }

  async build() {
    const plugins = Object.values(this[PLUGIN_MAP]);
    return Promise.all(plugins.map((plugin) => this.buildOne(plugin)));
  }

  async buildOne(plugin) {
    const {
      module, name, path, pluginConfig,
    } = plugin;
    const {
      hooks = {}, assets, services, configSchema, actions,
    } = module;
    const { onRoute, onCreate /* onOptionChange */ } = hooks;

    const isBuiltin = BUILTIN_PLUGIN.includes(name) || name === 'ui';
    const config = isBuiltin ? this.config : pluginConfig;
    // todo all variables below should be a new instance init with 'config'
    const {
      middleware, injector, io, events, router,
    } = this;
    const pluginLogger = logger.getPluginLogger(name);

    // @TODO Plugin onCreate Logic
    // onActive? onDeactive

    // todo option change
    // need unwatch
    // if (onOptionChange) {
    //   // watch builtin option change
    //   // not-builtin plugins should also watch builtin option change
    //   this.config.watch((event) => {
    //     // check builtin options change:
    //     //    affect('$.root') or affect(['$', 'root'])
    //     const watchEvent = {
    //       ...event,
    //       affect: (pathes) => {
    //         if (_.isString(pathes)) {
    //           pathes = pathes.split('.');
    //         }
    //         if (_.isArray(pathes) && pathes.length > 0 && pathes[0] === '$') {
    //           return event.affect(pathes.slice(1));
    //         }
    //         return false;
    //       },
    //     };
    //     onOptionChange.call(plugin, watchEvent);
    //   });
    //
    //   // watch plugin option change
    //   if (!isBuiltin) {
    //     config.watch((event) => {
    //       onOptionChange.call(plugin, event);
    //     });
    //   }
    // }

    if (actions) {
      Object.keys(actions).forEach((i) => {
        router.action(i, actions[i]);
      });
    }

    // set plugin configs
    if (!isBuiltin && configSchema) {
      config.setSchema(configSchema);
    }

    // regist service
    if (services) {
      Object.keys(services).forEach((i) => {
        io.registService(i, services[i]);
      });
    }

    // inject custom script and style
    // @TODO: more script type support
    if (assets) {
      // central testing
      const { test } = assets;

      ASSET_FIELDS.forEach((field) => {
        if (assets[field] && !Array.isArray(assets[field])) {
          assets[field] = [assets[field]];
        }
        if (assets[field] && assets[field].length) {
          assets[field].forEach((def) => {
            // short way support
            if (typeof def === 'string') {
              def = { filename: def };
            }

            if (typeof def === 'function') {
              def = { content: def };
            }

            if (typeof def.content === 'function') {
              def.content = def.content.bind(def, pluginConfig);
            }
            // to absolute filepath
            if (def.filename && !libPath.isAbsolute(def.filename)) {
              def.filename = libPath.join(path, def.filename);
            }
            if (field === 'script') {
              def.filter = (content) => {
                if (!content) return '';
                return `void function(svrx){${content} }(window.__svrx__._getScopedInstance('${name}'));`;
              };
            }
            if (!def.test) def.test = test;

            if (typeof def.test === 'function') {
              def.test.bind(def, pluginConfig);
            }

            injector.add(field, def);
          });
        }
      });
    }

    if (onRoute) {
      middleware.add(name, {
        priority: module.priority,
        onRoute: async (ctx, next) => onRoute(ctx, next, {
          config, io, events, logger: pluginLogger,
        }),
      });
    }

    if (onCreate) {
      return onCreate.call(plugin, {
        middleware,
        injector,
        events,
        config,
        router,
        io,
        logger: pluginLogger,
      });
    }
    return Promise.resolve();
  }
}

module.exports = PluginSystem;
