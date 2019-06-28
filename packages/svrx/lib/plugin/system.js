const nodeResolve = require('resolve');
const libPath = require('path');
const chalk = require('chalk');
const { npm } = require('svrx-util');
const { ASSET_FIELDS, BUILTIN_PLUGIN } = require('../constant');
const { normalizePluginName } = require('../util/helper');
const logger = require('../util/logger');
const semver = require('../util/semver');
const { getSatisfiedVersion, listMatchedPackageVersion } = require('./npm');

const PLUGIN_MAP = Symbol('PLUGIN_MAP');

class PluginSystem {
  /**
     * @param {Array} pluginlist
     */
  constructor({
    events, config, middleware, injector, io,
  }) {
    this.middleware = middleware;
    this.injector = injector;
    this.events = events;
    this.config = config;
    this.io = io;
    this[PLUGIN_MAP] = {};
    // regist builtin Service
    this.initService();
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
    return plugins.reduce((left, right) => left.then(() => this.loadOne(right)), Promise.resolve());
  }

  // @TODO: 重构重复代码过多
  async loadOne(pluginConfig) {
    const { config } = this;
    const pluginMap = this[PLUGIN_MAP];
    const name = pluginConfig.getInfo('name');
    const path = BUILTIN_PLUGIN.includes(name)
      ? libPath.join(__dirname, `./svrx-plugin-${name}`)
      : pluginConfig.getInfo('path');
    const hooks = pluginConfig.getInfo('hooks');
    const assets = pluginConfig.getInfo('assets');
    const inplace = pluginConfig.getInfo('inplace') || hooks || assets;

    if (pluginMap[name]) return pluginMap[name];

    // load inplace plugin
    if (inplace) {
      pluginMap[name] = {
        name,
        module: pluginConfig.getInfo(),
        path: config.get('root'),
        pluginConfig,
      };
      return pluginMap[name];
    }

    // load local plugin by name
    const resolveRet = await new Promise((resolve) => {
      const normalizedName = normalizePluginName(name);
      nodeResolve(
        normalizedName,
        {
          basedir: config.get('root'),
        },
        (err, res, pkg) => {
          if (err) { // suppress error
            resolve(null);
            return;
          }
          const svrxPattern = (pkg.engines && pkg.engines.svrx) || '*';
          if (semver.satisfies(svrxPattern)) {
            resolve({
              path: libPath.join(res.split(normalizedName)[0], normalizedName),
              /* eslint-disable global-require, import/no-dynamic-require */
              module: require(res),
              pkg,
            });
          }
        },
      );
    });
    if (resolveRet) {
      pluginMap[name] = {
        name,
        path: resolveRet.path,
        module: resolveRet.module,
        version: resolveRet.pkg.version,
        pluginConfig,
      };
      return pluginMap[name];
    }

    // load local plugin by path
    if (path && !pluginConfig.getInfo('install')) {
      // no install , just require
      let pkg;
      try {
        /* eslint-disable global-require, import/no-dynamic-require */
        pkg = require(libPath.join(path, 'package.json'));
      } catch (e) {
        pkg = {};
      }
      pluginMap[name] = {
        name,
        path,
        module: require(path),
        version: pkg.version,
        pluginConfig,
      };
      return pluginMap[name];
    }

    // install and load plugin
    const installOptions = {
      path: config.get('root'),
      npmLoad: {
        // loaded: true,
        prefix: config.get('root'),
      },
    };

    if (path === undefined) {
      // remote
      const done = logger.progress(`detecting satisfied plugin: ${chalk.gray(name)}`);
      let targetVersion;
      try {
        targetVersion = await getSatisfiedVersion(name, pluginConfig.getInfo('version'));
        done();
      } catch (e) {
        done();
      }
      if (!targetVersion) {
        // @TODO
        throw Error(
          'unmatched plugin version, please use other version\n'
                        + `${(await listMatchedPackageVersion(name)).join('\n')}`,
        );
      } else {
        installOptions.name = normalizePluginName(name);
        installOptions.version = targetVersion;
      }
    } else {
      // local install
      installOptions.name = path;
      installOptions.localInstall = true;
    }

    const installRet = await npm.install(installOptions);

    let pkg;
    try {
      pkg = require(libPath.join(path || installRet.path, 'package.json'));
    } catch (e) {
      pkg = {};
    }
    logger.notify(`${chalk.gray(name)}${pkg.version ? `@${pkg.version}` : ''} installed completely!`);
    pluginMap[name] = {
      name,
      path: path || installRet.path,
      module: require(path || installRet.path),
      version: pkg.version,
      pluginConfig,
    };
    return pluginMap[name];
  }

  getInstalledPluginNames() {
    return Object.keys(this[PLUGIN_MAP]);
  }

  async build() {
    const plugins = Object.values(this[PLUGIN_MAP]);
    return Promise.all(plugins.map(plugin => this.buildOne(plugin)));
  }

  async buildOne(plugin) {
    const {
      module, name, path, pluginConfig,
    } = plugin;
    const {
      hooks = {}, assets, services, configSchema,
    } = module;
    const { onRoute, onCreate /* onOptionChange */ } = hooks;

    const isBuiltin = BUILTIN_PLUGIN.includes(name);
    const config = isBuiltin ? this.config : pluginConfig;
    // todo all variables below should be a new instance init with 'config'
    const {
      middleware, injector, io, events,
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

    // set plugin configs
    if (!isBuiltin && configSchema) {
      config.setConfigs(configSchema);
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
        onCreate() {
          return async (ctx, next) => onRoute(ctx, next, { config, logger: pluginLogger });
        },
      });
    }

    if (onCreate) {
      return onCreate.call(plugin, {
        middleware,
        injector,
        events,
        config,
        io,
        logger: pluginLogger,
      });
    }
    return Promise.resolve();
  }
}

module.exports = PluginSystem;
