const _ = require('lodash');
const defaults = require('json-schema-defaults');
const PluginOption = require('./pluginOption');
const PluginInfo = require('./pluginInfo');
const INFO = Symbol('info');
const OPTION = Symbol('option');
const CONFIG = Symbol('config');
const DEFAULTS = Symbol('defaults');

class Plugin {
    constructor(data) {
        this[INFO] = new PluginInfo(_.omit(data, 'options'));
        this[OPTION] = new PluginOption(data.options);
        this[CONFIG] = {}; // todo
        this[DEFAULTS] = defaults({
            type: 'object',
            properties: this[CONFIG]
        }); // todo
    }

    /**
     * get option by pathes
     * @param pathes
     */
    get(pathes) {
        // todo need get builtin option eg: get('$root') get(['$root', 'rootPath'])
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
}

module.exports = Plugin;
