const nodeResolve = require('resolve');
const libPath = require('path');

// const Plugin = require('./plugin')
const { PLUGIN_PREFIX, ASSET_FIELDS } = require('../constant');
const { normalizePluginName } = require('../util/helper');
const logger = require('../util/logger');
const semver = require('../util/semver');
const { install, getSatisfiedVersion, listMatchedPackageVersion } = require('./npm');

const PLUGIN_MAP = Symbol('PLUGIN_MAP');
const BUILTIN_PLUGIN = ['livereload', 'proxy', 'serve'];

class PluginSystem {
    /**
     * @param {Array} pluginlist
     */
    constructor({ config, middleware, injector, io }) {
        this.middleware = middleware;
        this.config = config;
        this.injector = injector;
        this.io = io;
        this[PLUGIN_MAP] = {};
    }

    get(name) {
        return this[PLUGIN_MAP][name];
    }

    async load(plugins) {
        return plugins.reduce((left, right) => left.then(() => this.loadOne(right)), Promise.resolve());
    }

    // {name: 'test', version:'0.0.1', }
    // @TODO: 重构重复代码过多
    async loadOne(cfg) {
        if (typeof cfg === 'string') cfg = { name: cfg };
        let { name, path } = cfg;

        if (BUILTIN_PLUGIN.includes(name)) {
            path = libPath.join(__dirname, `./svrx-plugin-${name}`);
        }

        let config = this.config;
        let pluginMap = this[PLUGIN_MAP];
        let pkg, plugin;

        if (!name && path) {
            let tmpName = libPath.basename(path);
            if (tmpName.indexOf(PLUGIN_PREFIX) === 0) {
                name = tmpName.replace(PLUGIN_PREFIX, '');
            }
        }

        if (!name) throw Error('plugin name is required');

        if (pluginMap[name]) return pluginMap[name];

        // if has hooks or assets
        const inplace = cfg.hooks || cfg.assets;

        if (inplace) {
            return (pluginMap[name] = {
                name,
                module: cfg,
                path: config.get('root'),
                props: this.handleProps(cfg.propModels, cfg.props)
            });
        }

        const resolveRet = await new Promise((resolve, reject) => {
            let normalizedName = normalizePluginName(name);
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
            pkg = resolveRet.pkg;
            plugin = resolveRet.module;
            path = resolveRet.path;
        } else {
            // no install , just require
            if (path && !cfg.install) {
                plugin = require(path);
                try {
                    pkg = require(libPath.join(path, 'package.json'));
                } catch (e) {
                    pkg = {};
                }
            } else {
                const installOptions = {
                    path: config.get('root'),
                    npmLoad: {
                        loglevel: 'silent',
                        progress: false,
                        silent: true,
                        // loaded: true,
                        prefix: config.get('root')
                    }
                };
                if (path == null) {
                    const targetVersion = await getSatisfiedVersion(name, cfg.version);
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
                    installOptions.name = path;
                    installOptions.localInstall = true;
                }

                let installRet = await install(installOptions);

                logger.log(`plugin ${name} installed completely!`);

                path = installRet.path;
                plugin = require(path);
                pkg = require(libPath.join(path, 'package.json'));
            }
        }

        // has path
        return (pluginMap[name] = {
            name,
            path,
            module: plugin,
            version: pkg.version,
            props: this.handleProps(plugin.propModels, cfg.props)
        });
    }

    /**
     * [{ name: 'live-reload', version: '0.9.0', config: { enable: true} }]
     * @param {Array} plugins
     */
    handleProps(models, props) {
        // @TODO
        return props;
    }

    async build() {
        const plugins = Object.values(this[PLUGIN_MAP]);
        return Promise.all(plugins.map((plugin) => this.buildOne(plugin)));
    }

    async buildOne(plugin) {
        const { module, name, props, path } = plugin;
        const io = this.io;
        const hooks = module.hooks || {};
        const onRoute = hooks.onRoute;
        const onCreate = hooks.onCreate;
        // @TODO Plugin onCreate Logic
        // onActive? onDeactive
        const assets = module.assets;
        const services = module.services;

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

                        this.injector.add(field, def);
                    });
                }
            });
        }
        if (onRoute) {
            this.middleware.add(name, {
                priority: module.priority,
                onCreate(config) {
                    return async (ctx, next) => {
                        return onRoute(ctx, next, { props, config });
                    };
                }
            });
        }

        if (onCreate) {
            return onCreate.call(plugin, {
                middleware: this.middleware,
                injector: this.injector,
                config: this.config,
                io: this.io
            });
        }
    }
}

module.exports = PluginSystem;
