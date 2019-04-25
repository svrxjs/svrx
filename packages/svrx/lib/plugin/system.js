const nodeResolve = require('resolve');
const libPath = require('path');

// const Plugin = require('./plugin')
const { normalizePluginName } = require('../util/helper');
const { PLUGIN_PREFIX } = require('../constant');
const { install } = require('./npm');

const PLUGIN_MAP = Symbol('PLUGIN_MAP');

class PluginSystem {
    /**
     * @param {Array} pluginlist
     */
    constructor({ config, middleware }) {
        this.middleware = middleware;
        this.config = config;
        this[PLUGIN_MAP] = {};
    }

    get(name) {
        return this[PLUGIN_MAP][name];
    }

    async load(plugins) {
        return plugins.reduce((left, right) => left.then(() => this.loadOne(right)), Promise.resolve());
    }

    // {name: 'test', version:'0.0.1', }
    async loadOne(cfg) {
        let { name, path } = cfg;
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
            nodeResolve(normalizedName, { basedir: config.get('root') }, (err, res, pkg) => {
                if (err) return resolve(null); // suppress error
                resolve({
                    path: res.split(pkg.main || 'index.js')[0],
                    module: require(normalizedName),
                    pkg: pkg
                });
            });
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
                let installRet = await install({
                    name: path != null ? path : normalizePluginName(name),
                    localInstall: path != null,
                    path: config.get('root')
                });

                path = installRet.path;
                plugin = require(installRet.path);
                pkg = require(libPath.join(installRet.path + '/package.json'));
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
        const { module, name, props } = plugin;
        // @TODO 参数从config 来，而不是固定不变的
        const onRoute = module.hooks && module.hooks.onRoute;
        if (onRoute) {
            this.middleware.add(name, {
                priority: module.priority,
                onCreate(config) {
                    return async (ctx, next) => {
                        return onRoute(props, ctx, next);
                    };
                }
            });
        }
    }
}

module.exports = PluginSystem;
