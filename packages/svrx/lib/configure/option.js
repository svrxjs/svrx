const cosmiconfig = require('cosmiconfig');
const _ = require('lodash');
const path = require('path');
const OPTIONS = require('../option-list');
const logger = require('../util/logger');
const { PLUGIN_PREFIX } = require('../constant');
const Validator = require('./validator');

class Option {
    constructor() {
        this._rcFilePath = null;
        this._svrxProps = _.assign(OPTIONS || {}, {
            plugins: []
        });
        this._validator = new Validator(this._svrxProps);
    }

    formatInlineOptions(raw = {}) {
        const noAlias = this._removeAlias(raw);
        const picked = this._pickPlugins(noAlias);
        const arrayed = this._formatArray(picked);
        return arrayed;
    }

    rcFileRead() {
        try {
            const explorer = cosmiconfig('svrx');
            const result = explorer.searchSync();
            if (result && !result.isEmpty) {
                this._rcFilePath = result.filepath;
                return this._formatPlugins(result.config);
            }
        } catch (e) {
            logger.error(`Config file loaded fail because \n\n` + e.message);
        }

        return {};
    }

    /**
     * merge inline and rcfile options, validate and fill with defaults
     * @param inline
     * @param addon
     * @returns {*}
     */
    generate(inline = {}, addon = {}) {
        const merged = this._merge(inline, addon);
        const validated = this._validator.validate(merged);

        return this._fillWithDefaults(validated);
    }

    /**
     * validate a single plugin and fill with default
     */
    generateSinglePlugin(plugin = {}) {
        const validated = this._validator.validateSinglePlugin(plugin);
        return this._pluginFillWithDefaults(validated);
    }

    updatePluginProps(name, props = {}) {
        const { plugins } = this._svrxProps;
        const index = plugins.findIndex((p) => p.name === name);
        const pluginProps = _.assign(props, { name });

        // write props into _svrxProps
        if (index >= 0) {
            _.set(this._svrxProps, `plugins.${index}`, pluginProps);
        } else {
            this._svrxProps.plugins.push(pluginProps);
        }
    }

    /**
     * merged inline and rcfile options
     *   addons has a lower priority
     *   if the value type is array, the values will concat
     *   if the value type is object, the values will be merged
     *   if the key is 'plugins', the values will concat while the same 'name's
     * merged
     * @param options
     * @param addons
     * @private
     */
    _merge(options = {}, addons = {}) {
        const pluginMap = new Map();

        (addons.plugins || []).forEach((p) => {
            pluginMap.set(p.name, p);
        });
        (options.plugins || []).forEach((p) => {
            if (pluginMap.has(p.name)) {
                pluginMap.set(p.name, _.assign(pluginMap.get(p.name), p));
            } else {
                pluginMap.set(p.name, p);
            }
        });

        const customizer = (objValue, srcValue) => {
            if (_.isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        };
        const merged = _.mergeWith(_.cloneDeep(addons), options, customizer);

        merged.plugins = [...pluginMap.values()];
        return merged;
    }

    /**
     *
     * @param raw
     * @returns {*}
     * @private
     */
    _fillWithDefaults(raw = {}) {
        const result = _.cloneDeep(raw);
        _.keys(this._svrxProps).forEach((path) => {
            if (path === 'plugins') {
                const validPluginNames = this._svrxProps.plugins.map((plugin) => plugin.name);
                result.plugins = result.plugins.map((plugin) => {
                    if (validPluginNames.includes(plugin.name)) {
                        return this._pluginFillWithDefaults(plugin);
                    }
                    return plugin;
                });
                return;
            }
            const defaultValue = this._svrxProps[path].default;
            if (_.get(result, path) === undefined && defaultValue !== undefined) {
                _.set(result, path, defaultValue);
            }
        });
        return result;
    }

    _pluginFillWithDefaults(pluginRaw = {}) {
        const result = _.cloneDeep(pluginRaw);
        const pluginProps = this._svrxProps.plugins.find((p) => p.name === pluginRaw.name);

        _.keys(pluginProps).forEach((path) => {
            if (path === 'name') return;
            const defaultValue = pluginProps[path].default;
            if (_.get(result, path) === undefined && defaultValue !== undefined) {
                _.set(result, path, defaultValue);
            }
        });
        return result;
    }

    getRcfilePath() {
        return this._rcFilePath;
    }

    /**
     * replace alias with their real name
     * @param raw
     * @returns {*}
     */
    _removeAlias(raw = {}) {
        const options = _.cloneDeep(raw);
        const allPathAndAlias = [];
        Object.keys(this._svrxProps).forEach((confPath) => {
            if (this._svrxProps[confPath].alias) {
                allPathAndAlias.push({
                    alias: this._svrxProps[confPath].alias,
                    path: confPath
                });
            }
        });
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
     * generate plugins[] from cli options
     * (keys that not list in svrx/option-list.js will be recognized as plugin
     * names)
     *   {pluginName: true} -> { plugins: [{ name: pluginName }] }
     *   {pluginName: false} -> { plugins: [{ name: pluginName, _enable: false
     * }] }
     *   {pluginName: {pluginOptions}} -> { plugins: [{ name: pluginName,
     * ...pluginOptions }] }
     *   {plugins: 'a,b,c'} -> { plugins: [a,b,c] }
     * @param raw
     * @returns {*}
     * @private
     */
    _pickPlugins(raw = {}) {
        const result = _.cloneDeep(raw);
        const validKeys = Object.keys(this._svrxProps).map((key) => key.split('.')[0]);
        const pluginNames = Object.keys(raw).filter((key) => !validKeys.includes(key) && key !== 'plugins');

        result.plugins = _.isString(result.plugins) ? result.plugins.split(',') : [];
        pluginNames.forEach((name) => {
            const value = raw[name];
            const newValue = { name };

            if (value === false) {
                newValue._enable = false;
            }
            if (_.isPlainObject(value)) {
                _.assign(newValue, value);
            }
            result.plugins.push(newValue);
        });
        return this._formatPlugins(result);
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
     * fill up plugin name
     * @param raw
     * @returns {*}
     * @private
     */
    _formatPlugins(raw = {}) {
        const result = _.cloneDeep(raw);
        result.plugins = (raw.plugins || []).map((p) => {
            if (_.isString(p)) {
                return {
                    name: p
                };
            }
            if (_.isPlainObject(p)) {
                if (p.name) return { ...p };
                if (p.path) {
                    const tmp = path.basename(p.path);
                    if (tmp.indexOf(PLUGIN_PREFIX) === 0) {
                        return {
                            name: tmp.replace(PLUGIN_PREFIX, ''),
                            ...p
                        };
                    }
                }
            }

            logger.error('Plugin name is required');
            process.exit(1);
        });
        return result;
    }
}

module.exports = Option;
