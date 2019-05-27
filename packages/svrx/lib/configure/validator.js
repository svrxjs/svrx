const _ = require('lodash');
const logger = require('../util/logger');

class Validator {
    constructor(options) {
        this._svrxProps = options;
    }

    validate(raw = {}) {
        const formatted = this._removeInvalid(raw);

        const traverse = (obj, path = '') => {
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
                return;
            }
            if (path === 'plugins') return;

            const value = obj;
            const configs = _.get(this._svrxProps, path);
            const { type, choices } = configs;
            // check the value type
            if (!this._typeCheck(value, type)) {
                this._printErrorAndExit(`Config type error: ${path} should be a ${type}`);
            }
            // check the choices
            if (choices) {
                if (!choices.includes(value)) {
                    this._printErrorAndExit(`Config value error: ${path} should be one of [${choices.join(',')}]`);
                }
            }
        };
        traverse(formatted);

        // validate plugins one by one
        const validPluginNames = this._svrxProps.plugins.map((plugin) => plugin.name);
        formatted.plugins = formatted.plugins.map((plugin) => {
            if (validPluginNames.includes(plugin.name)) {
                return this.validateSinglePlugin(plugin);
            }
            return plugin;
        });

        return formatted;
    }

    validateSinglePlugin(pluginRaw = {}) {
        const formatted = this._removeInvalidInSinglePlugin(pluginRaw);
        const pluginProps = this._svrxProps.plugins.find((p) => p.name === formatted.name);

        const traverse = (obj, path = '') => {
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
                return;
            }
            if (path === 'name') return;

            const value = obj;
            const configs = _.get(pluginProps, path);
            const { type, choices } = configs;
            // check the value type
            if (!this._typeCheck(value, type)) {
                this._printErrorAndExit(`Config type error: Plugin ${formatted.name}.${path} should be a ${type}`);
            }
            // check the choices
            if (choices) {
                if (!choices.includes(value)) {
                    this._printErrorAndExit(
                        `Config value error: Plugin ${formatted.name}.${path} should be one of [${choices.join(',')}]`
                    );
                }
            }
        };
        traverse(formatted);

        return formatted;
    }

    _removeInvalid(raw = {}) {
        // remove options that not listed in svrx/option-list.js
        let result = _.cloneDeep(raw);
        const nestedProps = {};

        // transform option path(eg: 'a.b.c') into normal nested obj(eg:
        // {a:{b:{c}}})
        _.keys(this._svrxProps).forEach((path) => {
            _.set(nestedProps, path, this._svrxProps[path]);
        });

        // traverse user options and check if the key exists in nestedProps
        const traverse = (obj, path = '') => {
            if (path && _.get(nestedProps, path) === undefined && path !== 'plugins') {
                result = _.omit(result, [path]);
            }
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
            }
        };
        traverse(raw);

        // remove plugins that _enabled===false
        result.plugins = raw.plugins.filter((p) => p._enable !== false);

        // remove invalid options in plugins one by one
        const validPluginNames = this._svrxProps.plugins.map((plugin) => plugin.name);
        result.plugins = result.plugins.map((plugin) => {
            if (validPluginNames.includes(plugin.name)) {
                return this._removeInvalidInSinglePlugin(plugin);
            }
            return plugin;
        });

        return result;
    }

    _removeInvalidInSinglePlugin(pluginRaw = {}) {
        let result = _.cloneDeep(pluginRaw);
        const nestedProps = {};
        const pluginProps = this._svrxProps.plugins.find((p) => p.name === pluginRaw.name);

        // transform option path(eg: 'a.b.c') into normal nested obj(eg:
        // {a:{b:{c}}})
        _.keys(pluginProps).forEach((path) => {
            _.set(nestedProps, path, pluginProps[path]);
        });

        // traverse user options and check if the key exists in nestedProps
        const traverse = (obj, path = '') => {
            if (path && _.get(nestedProps, path) === undefined) {
                result = _.omit(result, [path]);
            }
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
            }
        };
        traverse(pluginRaw);

        return result;
    }

    _typeCheck(value, type) {
        if (type === 'number') {
            return _.isNumber(value);
        }
        if (type === 'string') {
            return _.isString(value);
        }
        if (type === 'boolean') {
            return _.isBoolean(value);
        }
        if (type === 'number[]') {
            return _.isArray(value) && value.every((v) => _.isNumber(v) || (!isNaN(v) && _.isNumber(parseFloat(v))));
        }
        if (type === 'string[]') {
            return _.isArray(value) && value.every((v) => _.isString(v));
        }
        if (type === 'boolean[]') {
            return _.isArray(value) && value.every((v) => _.isBoolean(v));
        }
    }

    _printErrorAndExit(message) {
        logger.error(message);
        process.exit(1);
    }
}

module.exports = Validator;
