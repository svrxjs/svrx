const _ = require('lodash');
const PluginOption = require('./pluginOption');
const PluginInfo = require('./pluginInfo');
const CONFIG_LIST = require('../config-list');

const INFO = Symbol('info');
const OPTION = Symbol('option');
const CONFIG = Symbol('config');
const DEFAULTS = Symbol('defaults');
const BUILTIN_OPTION = Symbol('builtinOption');
const BUILTIN_DEFAULTS = Symbol('builtinDefaults');
const BUILTIN_CONFIG = Symbol('builtinConfig');
const defaults = require('../util/jsonSchemaDefaults');

class Plugin {
  constructor(data = {}, builtinOption = {}, builtinDefaults = {}) {
    this[BUILTIN_OPTION] = builtinOption;
    this[BUILTIN_DEFAULTS] = builtinDefaults;
    this[INFO] = new PluginInfo(_.omit(data, 'options'));
    this[OPTION] = new PluginOption(data.options);
    this[CONFIG] = {};
    this[DEFAULTS] = {};
    this[BUILTIN_CONFIG] = CONFIG_LIST;

    this[INFO].validate();
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
        if (pathes.length === 1) {
          // get all builtin options and the defaults
          return { ...this[BUILTIN_DEFAULTS], ...this[BUILTIN_OPTION].get() };
        }
        const userOption = this[BUILTIN_OPTION].get(pathes.slice(1));
        if (userOption === undefined) return _.get(this[BUILTIN_DEFAULTS], pathes.slice(1));
        return userOption;
      }
    }

    // get from plugin option
    const userOption = this[OPTION].get(pathes);
    if (userOption === undefined) return _.get(this[DEFAULTS], pathes);
    if (pathes === undefined) { // get all and the defaults
      return { ...this[DEFAULTS], ...userOption };
    }
    return userOption;
  }

  /**
   * set plugin option
   * @param pluginPathes
   * @param value
   */
  set(pluginPathes, value) {
    this[OPTION].set(pluginPathes, value);
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
   * set config after plugin loaded
   * @param configs
   */
  setConfigs(configs = {}) {
    this[CONFIG] = configs;
    this[DEFAULTS] = defaults({
      type: 'object',
      properties: configs,
    });
    this[OPTION].validate(configs);
  }

  getSchema() {
    return this[BUILTIN_CONFIG];
  }
}

module.exports = Plugin;
