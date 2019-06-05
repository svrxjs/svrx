const nodeResolve = require('resolve');
const libPath = require('path');
const _ = require('lodash');

// const Plugin = require('./plugin')
const { ASSET_FIELDS, BUILTIN_PLUGIN } = require('../constant');
const { normalizePluginName } = require('../util/helper');
const logger = require('../util/logger');
const semver = require('../util/semver');
const { install, getSatisfiedVersion, listMatchedPackageVersion } = require('./npm');

const PLUGIN_MAP = Symbol('PLUGIN_MAP');

class PluginSystem {
    /**
     * @param {Array} pluginlist
     */
    constructor({ events, config, middleware, injector, io }) {
        this.middleware = middleware;
        this.injector = injector;
        this.events = events;
        this.config = config;
        this.io = io;
        this[PLUGIN_MAP] = {};
    }

    get(name) {
        return this[PLUGIN_MAP][name];
    }

    async load(plugins) {
        return plugins.reduce((left, right) => left.then(() => this.loadOne(right)), Promise.resolve());
    }

    // @TODO: 重构重复代码过多
    async loadOne(pluginConfig) {
        const config = this.config;
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
            return (pluginMap[name] = {
                name,
                module: pluginConfig.getInfo(),
                path: config.get('root'),
                pluginConfig
            });
        }

        // load local plugin by name
        const resolveRet = await new Promise((resolve) => {
            const normalizedName = normalizePluginName(name);
            nodeResolve(
                normalizedName,
                {
                    basedir: config.get('root')
                },
                (err, res, pkg) => {
                    if (err) return resolve(null); // suppress error
                    const svrxPattern = (pkg.engines && pkg.engines.svrx) || '*';
                    if (semver.satisfies(svrxPattern)) {
                        resolve({
                            path: libPath.join(res.split(normalizedName)[0], normalizedName),
                            module: require(res),
                            pkg: pkg
                        });
                    }
                }
            );
        });
        if (resolveRet) {
            return (pluginMap[name] = {
                name,
                path: resolveRet.path,
                module: resolveRet.module,
                version: resolveRet.pkg.version,
                pluginConfig
            });
        }

        // load local plugin by path
        if (path && !pluginConfig.getInfo('install')) {
            // no install , just require
            let pkg;
            try {
                pkg = require(libPath.join(path, 'package.json'));
            } catch (e) {
                pkg = {};
            }
            return (pluginMap[name] = {
                name,
                path,
                module: require(path),
                version: pkg.version,
                pluginConfig
            });
        }

        // install and load plugin
        const installOptions = {
            path: config.get('root'),
            npmLoad: {
                // loaded: true,
                prefix: config.get('root')
            }
        };
        if (path === undefined) {
            // remote
            const targetVersion = await getSatisfiedVersion(name, pluginConfig.getInfo('version'));
            if (!targetVersion) {
                // @TODO
                throw Error(
                    `unmatched plugin version, please use other version\n` +
                        `${(await listMatchedPackageVersion(name)).join('\n')}`
                );
            }
            installOptions.name = normalizePluginName(name);
            installOptions.version = targetVersion;
        } else {
            // local install
            installOptions.name = path;
            installOptions.localInstall = true;
        }
        const installRet = await install(installOptions);

        logger.log(`plugin ${name} installed completely!`);

        let pkg;
        try {
            pkg = require(libPath.join(path || installRet.path, 'package.json'));
        } catch (e) {
            pkg = {};
        }
        return (pluginMap[name] = {
            name,
            path: path || installRet.path,
            module: require(path || installRet.path),
            version: pkg.version,
            pluginConfig
        });
    }

    async build() {
        const plugins = Object.values(this[PLUGIN_MAP]);
        return Promise.all(plugins.map((plugin) => this.buildOne(plugin)));
    }

    async buildOne(plugin) {
        const { module, name, path, pluginConfig } = plugin;
        const { hooks = {}, assets, services, configs } = module;
        const { onRoute, onCreate, onOptionChange } = hooks;

        const isBuiltin = BUILTIN_PLUGIN.includes(name);
        const config = isBuiltin ? this.config : pluginConfig;
        // todo all variables below should be a new instance init with 'config'
        const middleware = this.middleware;
        const injector = this.injector;
        const io = this.io;
        const events = this.events;

        // @TODO Plugin onCreate Logic
        // onActive? onDeactive

        // option change
        // todo unwatch?
        if (onOptionChange) {
            // watch builtin option change
            // not-builtin plugins should also watch builtin option change
            this.config.watch((event) => {
                // check builtin options change:
                //    affect('$.root') or affect(['$', 'root'])
                const watchEvent = {
                    ...event,
                    affect: (pathes) => {
                        if (_.isString(pathes)) {
                            pathes = pathes.split('.');
                        }
                        if (_.isArray(pathes) && pathes.length > 0 && pathes[0] === '$') {
                            return event.affect(pathes.slice(1));
                        }
                        return false;
                    }
                };
                onOptionChange.call(plugin, watchEvent);
            }); // todo check

            // watch plugin option change
            if (!isBuiltin) {
                config.watch((event) => {
                    onOptionChange.call(plugin, event);
                });
            }
        }

        if (configs) {
            // todo update plugin configs
        }

        // regist service
        if (services) {
            for (let i in services) {
                if (services.hasOwnProperty(i)) {
                    io.registService(i, services[i]);
                }
            }
        }

        // inject custom script and style
        // @TODO: more script type support
        if (assets) {
            // central testing
            const test = assets.test;

            ASSET_FIELDS.forEach((field) => {
                if (Array.isArray(assets[field]) && assets[field].length) {
                    assets[field].forEach((def) => {
                        // short way support
                        if (typeof def === 'string') {
                            def = { filename: def };
                        }
                        // to absolute filepath
                        if (def.filename && !libPath.isAbsolute(def.filename)) {
                            def.filename = libPath.join(path, def.filename);
                        }
                        if (!def.test) def.test = test;

                        injector.add(field, def);
                    });
                }
            });
        }

        if (onRoute) {
            middleware.add(name, {
                priority: module.priority,
                onCreate() {
                    return async (ctx, next) => {
                        return onRoute(ctx, next, { config, logger });
                    };
                }
            });
        }

        if (onCreate) {
            return onCreate.call(plugin, {
                middleware,
                injector,
                events,
                config,
                io,
                logger
            });
        }
    }
}

module.exports = PluginSystem;
