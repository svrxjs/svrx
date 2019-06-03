/**
 *  todo 如何处理rcfile plugin更新
 *  onOptionChange的意义
 *  第三方plugin如何获取builtin option
 */

const _ = require('lodash');
const defaults = require('json-schema-defaults');
const path = require('path');
const CONFIG_LIST = require('../config-list');
const BuiltinOption = require('./builtinOption');
const Plugin = require('./plugin');
const { PLUGIN_PREFIX, BUILTIN_PLUGIN } = require('../constant');

class Configure {
    constructor(data = {}) {
        if (Configure.prototype.Instance === undefined) {
            this._bootstrap(data);
            Configure.prototype.Instance = this;
        }
        return Configure.prototype.Instance;
    }

    /**
     * get user option by pathes
     * @param builtinPathes
     */
    get(builtinPathes) {
        const userOption = this._builtinOption.get(builtinPathes);
        if (userOption === undefined) return _.get(this._builtinDefaults, builtinPathes);
        return userOption;
    }

    set(builtinPathes, value) {
        this._builtinOption.set(value);
    }

    /**
     * get all plugins
     * @returns {Array}
     */
    getPlugins() {
        return this._plugins;
    }

    /**
     * get plugin option instance by plugin name
     * @param name
     * @returns {*}
     */
    getPlugin(name) {
        return this._plugins.find((p) => p.getInfo('name') === name);
    }

    /**
     * watch builtin option change
     * @param pathes
     * @param callback
     */
    watch(pathes, callback) {
        this._builtinOption.watch(pathes, callback);
    }

    watchPlugin(name, callback) {
        // todo
    }

    updateBuiltinOptions(rcOptions = {}) {
        const opionWithoutPlugins = _.pickBy(rcOptions, (value, key) => key !== 'plugins');
        this._builtinOption.updateOptions(opionWithoutPlugins);
    }

    _bootstrap(data) {
        const { rc, cli } = data;
        this._builtinConfig = CONFIG_LIST;
        this._builtinOption = null;
        this._plugins = [];
        this._builtinDefaults = defaults({
            type: 'object',
            properties: this._builtinConfig
        });

        const rcfileOption = rc;
        const cliOption = this._parseCliOption(cli); // parse cli option

        // generate builtin option ( remove plugin info
        const rcOpionWithoutPlugins = _.pickBy(rcfileOption, (value, key) => key !== 'plugins');
        const configKeys = _.keys(this._builtinConfig);
        // (keys that not list in _builtinConfig will be recognized as plugin
        // names)
        const cliOptionWithoutPlugins = _.pickBy(cliOption, (value, key) => configKeys.includes(key));
        this._builtinOption = new BuiltinOption({
            cli: cliOptionWithoutPlugins,
            rc: rcOpionWithoutPlugins
        });

        // pick plugins and plugin options from rcOption & cliOption
        const builtinPlugins = BUILTIN_PLUGIN.map((p) => ({ name: p }));
        const cliPlugins = this._pickPluginsFromCli(cliOption);
        const rcPlugins = this._pickPluginsFromRc(rcfileOption);
        const userPlugins = this._mergePlugins(cliPlugins, rcPlugins);
        const plugins = this._mergePlugins(userPlugins, builtinPlugins); // add builtin plugins

        _.forEach(plugins, (plugin) => {
            this._plugins.push(new Plugin(plugin));
        });
    }

    _parseCliOption(raw = {}) {
        const noDash = this._removeDashProp(raw);
        const noAlias = this._removeAlias(noDash);
        const arrayed = this._formatArray(noAlias);
        return arrayed;
    }

    /**
     * remove original dashed key, keep the camel ones
     * @param raw
     * @private
     */
    _removeDashProp(raw = {}) {
        const options = _.mapValues(raw, (o) => {
            if (_.isPlainObject(o)) {
                return this._removeDashProp(o);
            }
            return o;
        });

        return _.pickBy(options, (value, key) => key.indexOf('-') < 0);
    }

    /**
     * replace alias with their real name
     * @param raw
     * @returns {*}
     */
    _removeAlias(raw = {}) {
        const options = _.cloneDeep(raw);
        const allPathAndAlias = [];

        const traverse = (obj, path = '') => {
            if (obj.type === 'object') {
                _.keys(obj.properties).forEach((key) => {
                    traverse(obj.properties[key], path === '' ? key : `${path}.${key}`);
                });
                return;
            }

            if (obj.alias) {
                allPathAndAlias.push({
                    alias: obj.alias,
                    path: path
                });
            }
        };
        traverse({ type: 'object', properties: this._builtinConfig });

        allPathAndAlias
            .filter((pair) => raw[pair.alias] !== undefined)
            .forEach((pair) => {
                const value = raw[pair.alias];
                delete options[pair.alias];
                _.set(options, pair.path, value);
            });

        return options;
    }

    /**
     * transform cli array('a,b,c') to array([a,b,c])
     * @param raw
     * @returns {*}
     * @private
     */
    _formatArray(raw = {}) {
        const result = _.cloneDeep(raw);
        const traverse = (obj, path = '') => {
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
                return;
            }
            const value = obj;
            if (_.isString(value) && value.indexOf(',') >= 0) {
                _.set(result, path, value.split(','));
            }
        };
        traverse(raw);
        return result;
    }

    /**
     * generate plugins[] from cli options
     * (keys that not list in svrx/config-list.js will be recognized as plugin
     * names)
     *   {pluginName: true} -> { plugins: [{ name: pluginName }] }
     *   {pluginName: false} -> { plugins: [{ name: pluginName, _enable: false
     * }] }
     *   {pluginName: {pluginInfos}} -> { plugins: [{ name: pluginName,
     * ...pluginInfos }] }
     * @param raw
     * @returns {Array}
     * @private
     */
    _pickPluginsFromCli(raw = {}) {
        const plugins = [];
        const configKeys = _.keys(this._builtinConfig);
        const cliPlugins = _.pickBy(raw, (value, key) => !configKeys.includes(key));

        _.keys(cliPlugins).forEach((name) => {
            const value = cliPlugins[name];
            const newValue = { name };

            if (value === false) {
                newValue._enable = false;
            }
            if (_.isPlainObject(value)) {
                _.assign(newValue, value);
            }
            plugins.push(newValue);
        });

        return plugins;
    }

    _pickPluginsFromRc(raw = {}) {
        if (!raw.plugins || !_.isArray(raw.plugins)) return [];
        const plugins = [];
        _.forEach(raw.plugins, (plugin) => {
            if (_.isString(plugin)) {
                plugins.push({
                    name: plugin
                });
            } else if (_.isPlainObject(plugin)) {
                plugins.push(plugin);
            }
        });
        return plugins;
    }

    /**
     * merge plugins that has the same name
     * srcPlugins option has a higher priority
     * @param srcPlugins
     * @param addonPlugins
     * @returns {*}
     * @private
     */
    _mergePlugins(srcPlugins = [], addonPlugins = []) {
        const pluginMap = new Map();

        _.forEach(addonPlugins, (p) => {
            if (p.name !== undefined) {
                pluginMap.set(p.name, p);
            } else {
                // local plugins
                const name = this._getLocalPluginName(p);
                if (name) {
                    pluginMap.set(name, { ...p, name });
                }
            }
        });

        _.forEach(srcPlugins, (p) => {
            if (p.name !== undefined) {
                if (pluginMap.has(p.name)) {
                    pluginMap.set(p.name, _.assign(pluginMap.get(p.name), p));
                } else {
                    pluginMap.set(p.name, p);
                }
            } else {
                // local plugins
                const name = this._getLocalPluginName(p);
                if (name) {
                    pluginMap.set(name, { ...p, name });
                }
            }
        });

        return [...pluginMap.values()].filter((p) => p._enable !== false);
    }

    /**
     * get local plugin name (local plugin is defined with 'path')
     * @param plugin
     * @returns {string}
     * @private
     */
    _getLocalPluginName(plugin) {
        if (plugin.path) {
            const tmp = path.basename(plugin.path);
            if (tmp.indexOf(PLUGIN_PREFIX) === 0) {
                return tmp.replace(PLUGIN_PREFIX, '');
            }
        }
        return null;
    }
}

module.exports = Configure;
