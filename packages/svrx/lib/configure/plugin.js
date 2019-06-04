const _ = require('lodash');
const defaults = require('json-schema-defaults');
const PluginOption = require('./pluginOption');
const PluginInfo = require('./pluginInfo');

class Plugin {
    constructor(data) {
        this._info = new PluginInfo(_.omit(data, 'options'));
        this._option = new PluginOption(data.options);
        this._config = {}; // todo
        this._defaults = defaults({
            type: 'object',
            properties: this._config
        }); // todo
    }

    /**
     * get option by pathes
     * @param pathes
     */
    get(pathes) {
        const userOption = this._option.get(pathes);
        if (userOption === undefined) return _.get(this._defaults, pathes);
        return userOption;
    }

    /**
     * get plugin info by pathes
     * @param infoPathes
     * @returns {*}
     */
    getInfo(infoPathes) {
        return this._info.get(infoPathes);
    }
}

module.exports = Plugin;
