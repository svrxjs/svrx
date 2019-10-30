const _ = require('lodash');
const PluginOption = require('./pluginOption');
const PluginInfo = require('./pluginInfo');

const INFO = Symbol('info');
const OPTION = Symbol('option');
const CONFIG = Symbol('config');
const DEFAULTS = Symbol('defaults');
const BUILTIN_OPTION = Symbol('builtinOption');
const BUILTIN_DEFAULTS = Symbol('builtinDefaults');

const defaults = require('../util/jsonSchemaDefaults');

class Plugin {
  constructor(data = {}, builtinOption = {}, builtinDefaults = {}) {
    this[BUILTIN_OPTION] = builtinOption;
    this[BUILTIN_DEFAULTS] = builtinDefaults;
    this[INFO] = new PluginInfo(_.omit(data, 'options'));
    this[OPTION] = new PluginOption(data.options);
    this[CONFIG] = {};
    this[DEFAULTS] = {};

    this[INFO].validate();
  }

  /**
   * check if pathes is builtin query, parse string path to array
   * @param pathes
   * @returns {void|Array|{pathes: *, isBuiltin: boolean}}
   * @private
   */
  static _parsePathes(pathes) {
    if (_.isString(pathes)) {
      pathes = pathes.split('.');
    }
    if (_.isArray(pathes) && pathes.length > 0) {
      if (pathes[0] === '$') {
        return {
          isBuiltin: true,
          pathes: pathes.slice(1),
        };
      }
    }
    return {
      isBuiltin: false,
      pathes,
    };
  }

  /**
     * get plugin option by pathes eg: get('color')
     * get builtin option by $.pathes eg: get('$.root') 、get(['$', root', 'rootPath'])
     * @param pathes
     */
  get(pathes) {
    const { isBuiltin, pathes: parsedPathes } = Plugin._parsePathes(pathes);

    if (isBuiltin) {
      if (pathes.length === 1) { // get('$')
        // get all builtin options and the defaults
        return { ...this[BUILTIN_DEFAULTS], ...this[BUILTIN_OPTION].get() };
      }

      // get from builtin option
      const userOption = this[BUILTIN_OPTION].get(parsedPathes);
      if (userOption === undefined) return _.get(this[BUILTIN_DEFAULTS], parsedPathes);
      return userOption;
    }

    // get from plugin option
    const userOption = this[OPTION].get(parsedPathes);
    if (userOption === undefined) return _.get(this[DEFAULTS], parsedPathes);
    if (parsedPathes === undefined) { // get all and the defaults
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
    return this;
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
  setSchema(configs = {}) {
    this[CONFIG] = configs;
    this[DEFAULTS] = defaults({
      type: 'object',
      properties: configs,
    });
    this[OPTION].validate(configs);
  }

  getSchema() {
    return this[CONFIG];
  }

  watch(pathes, callback) {
    const { isBuiltin, pathes: parsedPathes } = Plugin._parsePathes(pathes);

    if (isBuiltin) {
      return this[BUILTIN_OPTION].watch(parsedPathes, callback);
    }

    return this[OPTION].watch(parsedPathes, callback);
  }

  splice(...args) {
    this[OPTION].splice(...args);
    return this;
  }

  del(pathes) {
    this[OPTION].del(pathes);
  }
}

module.exports = Plugin;
