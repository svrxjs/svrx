const _ = require('lodash');
const defaults = require('json-schema-defaults');
const PluginOption = require('./pluginOption');
const PluginInfo = require('./pluginInfo');
const INFO = Symbol('info');
const OPTION = Symbol('option');
const CONFIG = Symbol('config');
const DEFAULTS = Symbol('defaults');
const BUILTIN_OPTION = Symbol('builtinOption');
const BUILTIN_DEFAULTS = Symbol('builtinDefaults');

class Plugin {
    constructor(data = {}, builtinOption = {}, builtinDefaults = {}) {
        this[BUILTIN_OPTION] = builtinOption;
        this[BUILTIN_DEFAULTS] = builtinDefaults;
        this[INFO] = new PluginInfo(_.omit(data, 'options'));
        this[OPTION] = new PluginOption(data.options);
        this[CONFIG] = {}; // todo
        this[DEFAULTS] = defaults({
            type: 'object',
            properties: this[CONFIG]
        }); // todo
    }

    /**
     * get plugin option by pathes eg: get('color')
     * get builtin option by $.pathes eg: get('$.root') 、get(['$', root', 'rootPath'])
     * @param pathes
     */
    get(pathes) {
        // get from builtin option
        if (_.isString(pathes)) {
            pathes = pathes.split('.');
        }
        if (_.isArray(pathes) && pathes.length > 0) {
            if (pathes[0] === '$') {
                const userOption = this[BUILTIN_OPTION].get(pathes.slice(1));
                if (userOption === undefined) return _.get(this[BUILTIN_DEFAULTS], pathes.slice(1));
                return userOption;
            }
        }

        // get from plugin option
        const userOption = this[OPTION].get(pathes);
        if (userOption === undefined) return _.get(this[DEFAULTS], pathes);
        return userOption;
    }

    /**
     * get plugin info by pathes
     * @param infoPathes
     * @returns {*}
     */
    getInfo(infoPathes) {
        return this[INFO].get(infoPathes);
    }

    /**
     * watch option change
     * @param pathes
     * @param callback
     */
    watch(pathes, callback) {
        this[OPTION].watch(pathes, callback);
    }
}

module.exports = Plugin;
