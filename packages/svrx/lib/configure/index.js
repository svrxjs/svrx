const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { logger, nameFormatter } = require('@svrx/util');
const CONFIG_LIST = require('../config-list');
const BuiltinOption = require('./builtinOption');
const Plugin = require('./plugin');
const { BUILTIN_PLUGIN } = require('../constant');
const defaults = require('../util/jsonSchemaDefaults');

const { parsePluginName } = nameFormatter;

const BUILTIN_OPTION = Symbol('builtinOption');
const BUILTIN_CONFIG = Symbol('builtinConfig');
const BUILTIN_DEFAULTS = Symbol('builtinDefaults');
const PLUGINS = Symbol('plugins');
const CLI_OPTION = Symbol('cliOption');

class Configure {
  constructor(data = {}) {
    const { inline, rc, cli } = data;
    this[BUILTIN_CONFIG] = CONFIG_LIST;
    this[BUILTIN_OPTION] = null;
    this[PLUGINS] = [];
    this[CLI_OPTION] = {};

    this[BUILTIN_DEFAULTS] = defaults({
      type: 'object',
      properties: this[BUILTIN_CONFIG],
    });

    const rcOption = _.assign({}, rc, inline);
    const cliOption = this._parseCliOption(cli); // parse cli option
    this[CLI_OPTION] = cliOption;

    // generate builtin option ( remove plugin info
    const rcOpionWithoutPlugins = _.pickBy(
      rcOption,
      (value, key) => key !== 'plugins',
    );
    const configKeys = _.keys(this[BUILTIN_CONFIG]);
    // (keys that not list in _builtinConfig will be recognized as plugin names)
    const cliOptionWithoutPlugins = _.pickBy(
      cliOption,
      (value, key) => key !== 'plugins' && configKeys.includes(key),
    );
    this[BUILTIN_OPTION] = new BuiltinOption({
      cli: cliOptionWithoutPlugins,
      rc: rcOpionWithoutPlugins,
    });

    // pick plugins and plugin options from rcOption & cliOption
    const builtinPlugins = BUILTIN_PLUGIN.map((p) => ({ name: p }));
    const cliPlugins = this._pickPluginsFromCli(cliOption);
    const rcPlugins = Configure._pickPluginsFromRc(rcOption);
    const userPlugins = Configure._mergePlugins(cliPlugins, rcPlugins);
    // add builtin plugins
    const plugins = Configure._mergePlugins(userPlugins, builtinPlugins);

    _.forEach(plugins, (plugin) => {
      const pIns = new Plugin(plugin, this[BUILTIN_OPTION], this[BUILTIN_DEFAULTS]);
      this[PLUGINS].push(pIns);
    });

    this[BUILTIN_OPTION].validate(this[BUILTIN_CONFIG]);
  }

  /**
   * get user option by pathes
   * @param builtinPathes
   */
  get(builtinPathes) {
    const userOption = this[BUILTIN_OPTION].get(builtinPathes);
    if (userOption === undefined) {
      return _.get(this[BUILTIN_DEFAULTS], builtinPathes);
    }
    if (builtinPathes === undefined) { // get all and the defaults
      return { ...this[BUILTIN_DEFAULTS], ...userOption };
    }
    return userOption;
  }

  set(builtinPathes, value) {
    this[BUILTIN_OPTION].set(builtinPathes, value);
  }

  del(pathes) {
    this[BUILTIN_OPTION].del(pathes);
  }

  splice(...args) {
    this[BUILTIN_OPTION].splice(...args);
    return this;
  }

  watch(pathes, callback) {
    return this[BUILTIN_OPTION].watch(pathes, callback);
  }

  // for ui
  builtinsSet(settings = {}) {
    Object.keys(settings).forEach((key) => {
      this.set(key, settings[key]);
    });
  }

  // for ui
  pluginsSet(settings = {}) { // eslint-disable-line
    // todo 发送事件，交给插件自行处理
    // todo 提供插件热重启方法
    // console.log('pluginsSet');
    // console.log(settings); // { qrcode: { cli: false, ui: true, console: false } }
  }

  /**
   * get all plugins
   * @returns {Array}
   */
  getPlugins() {
    return this[PLUGINS];
  }

  /**
   * get plugin option instance by plugin name
   * @param name
   * @returns {*}
   */
  getPlugin(name) {
    return this[PLUGINS].find((p) => p.getInfo('name') === name);
  }

  /**
   * get builtin plugins
   * @returns {Array}
   */
  getExternalPlugins() {
    return this[PLUGINS].filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
  }

  getSchema() {
    return this[BUILTIN_CONFIG];
  }

  _parseCliOption(raw = {}) {
    const noDash = this._removeDashProp(raw);
    const noAlias = this._removeAlias(noDash);
    const arrayed = Configure._formatArray(noAlias);
    return Configure._parsePluginQueryString(arrayed);
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

    const traverse = (obj, objpath = '') => {
      if (obj.type === 'object') {
        _.keys(obj.properties).forEach((key) => {
          traverse(obj.properties[key], objpath === '' ? key
            : `${objpath}.${key}`);
        });
        return;
      }

      if (obj.alias) {
        allPathAndAlias.push({
          alias: obj.alias,
          path: objpath,
        });
      }
    };
    traverse({ type: 'object', properties: this[BUILTIN_CONFIG] });

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
  static _formatArray(raw = {}) {
    const result = _.cloneDeep(raw);
    const traverse = (obj, objpath = '') => {
      if (_.isPlainObject(obj)) {
        _.keys(obj).forEach((key) => {
          traverse(obj[key], objpath === '' ? key : `${objpath}.${key}`);
        });
        return;
      }
      const value = obj;
      if (_.isString(value) && value.indexOf(',') >= 0) {
        _.set(result, objpath, value.split(','));
      }
    };
    traverse(raw);
    return result;
  }

  /**
   * parse cli plugin query string, add 'plugins' and remove 'plugin'
   * --plugin @scope/webpack@0.0.1?foo=bar&biz=piz
   * @param raw
   * @private
   */
  static _parsePluginQueryString(raw = {}) {
    const result = _.cloneDeep(raw);
    const pluginStrings = result.plugin;
    const plugins = [];
    const parseTypes = (ops) => {
      const newOps = {};
      const keyMap = {
        undefined,
        null: null,
        true: true,
        false: false,
      };
      Object.keys(ops).forEach((key) => {
        const value = ops[key];
        if (/^\d+$/.test(value)) {
          newOps[key] = parseInt(value, 10);
        } else if (value in keyMap) {
          newOps[key] = keyMap[value];
        } else {
          newOps[key] = value;
        }
      });
      return newOps;
    };
    const reg = /^((@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+)(@(\d+\.\d+\.\d+))?(\?(.*))?$/;
    const getPlugin = (pluginString) => {
      const matches = reg.exec(pluginString);
      if (matches) {
        return {
          name: matches[1],
          version: matches[4],
          options: matches[6] ? parseTypes(querystring.parse(matches[6])) : {},
        };
      }
      logger.error(`Plugin string parse error: ${pluginString}`);
      return null;
    };

    if (_.isString(pluginStrings)) {
      const plugin = getPlugin(pluginStrings);
      if (plugin) {
        plugins.push(plugin);
      }
    } else if (_.isArray(pluginStrings)) {
      pluginStrings.forEach((pstring) => {
        const plugin = getPlugin(pstring);
        if (plugin) {
          plugins.push(plugin);
        }
      });
    }
    result.plugins = plugins;
    delete result.plugin;

    return result;
  }

  /**
   * generate plugins[] from cli options
   * (keys that not list in svrx/config-list.js will be recognized as plugin
   * names)
   *   {pluginName: true} -> { plugins: [{ name: pluginName }] }
   *   {pluginName: false} -> { plugins: [{ name: pluginName, _enable: false
   * }] }
   *   {pluginName: {pluginOptions}} -> { plugins: [
   *        { name: pluginName, options: {...pluginInfos} }
   *     ] }
   * @param raw
   * @returns {Array}
   * @private
   */
  _pickPluginsFromCli(raw = {}) {
    const plugins = raw.plugins || [];
    const configKeys = _.keys(this[BUILTIN_CONFIG]);
    const cliPlugins = _.pickBy(raw, (value, key) => !configKeys.includes(key));

    _.keys(cliPlugins).forEach((name) => {
      const value = cliPlugins[name];
      const newValue = { name };

      if (value === false) {
        newValue._enable = false;
      }
      plugins.push(newValue);
    });

    return plugins;
  }

  static _pickPluginsFromRc(raw = {}) {
    if (!raw.plugins || !_.isArray(raw.plugins)) return [];
    const plugins = [];
    _.forEach(raw.plugins, (plugin) => {
      if (_.isString(plugin)) {
        plugins.push({
          name: plugin,
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
  static _mergePlugins(srcPlugins = [], addonPlugins = []) {
    const pluginMap = new Map();

    _.forEach(addonPlugins, (p) => {
      if (p.name !== undefined) {
        pluginMap.set(p.name, p);
      } else {
        // local plugins
        const name = Configure._getLocalPluginName(p);
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
  static _getLocalPluginName(plugin) {
    /* eslint-disable global-require */
    if (plugin.path) {
      const jsonPath = path.join(plugin.path, 'package.json');
      if (fs.existsSync(jsonPath)) {
        const packageName = require(jsonPath).name;
        return parsePluginName(packageName);
      }
      return require(plugin.path).name;
    }
    return null;
    /* eslint-enable global-require */
  }
}

module.exports = Configure;
