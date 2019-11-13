const { PackageManagerCreator } = require('@svrx/util');
const libPath = require('path');

const { BUILTIN_PLUGIN, VERSION } = require('../constant');

function requireEnsure(path) {
  delete require.cache[path];
  /* eslint-disable global-require, import/no-dynamic-require */
  return require(path);
}

const loaders = [
  {
    // from builtIn
    test(pluginConfig) {
      const name = pluginConfig.getInfo('name');
      return BUILTIN_PLUGIN.includes(name);
    },
    async load(pluginConfig) {
      const name = pluginConfig.getInfo('name');
      const path = libPath.join(__dirname, `./svrx-plugin-${name}`);
      return {
        name,
        path,
        module: requireEnsure(path),
        version: VERSION,
        pluginConfig,
      };
    },
  },
  {
    // form inplace
    test(pluginConfig) {
      return pluginConfig.getInfo('inplace') || pluginConfig.getInfo('hooks');
    },
    async load(pluginConfig, config) {
      return {
        name: pluginConfig.getInfo('name'),
        module: pluginConfig.getInfo(),
        path: config.get('root'),
        version: pluginConfig.getInfo('version'),
        pluginConfig,
      };
    },
  },
  {
    // from path
    test(pluginConfig) {
      return !!pluginConfig.getInfo('path') && !pluginConfig.getInfo('install');
    },
    async load(pluginConfig) {
      const pm = PackageManagerCreator({
        plugin: pluginConfig.getInfo('name'),
        path: pluginConfig.getInfo('path'),
        version: pluginConfig.getInfo('version'),
        coreVersion: VERSION,
      });
      const pkg = await pm.load();

      return {
        ...pkg,
        pluginConfig,
      };
    },
  },
  {
    // from npm
    test(pluginConfig) {
      return !!pluginConfig.getInfo('name');
    },
    async load(pluginConfig, config) {
      const pm = PackageManagerCreator({
        plugin: pluginConfig.getInfo('name'),
        path: pluginConfig.getInfo('path'),
        version: pluginConfig.getInfo('version'),
        coreVersion: VERSION,
        registry: config.get('registry'),
      });
      const pkg = await pm.load();

      return {
        ...pkg,
        pluginConfig,
      };
    },
  },
];

function getLoader(plugin) {
  if (typeof plugin.getInfo('load') === 'function') return plugin.getInfo('load');

  return loaders.find((loader) => loader.test(plugin)).load;
}

module.exports = { getLoader };
