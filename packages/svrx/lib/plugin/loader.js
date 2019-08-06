const libPath = require('path');
const { BUILTIN_PLUGIN, VERSION } = require('../constant');
const { install, getSatisfiedVersion, listMatchedPackageVersion } = require('./npm');
const { normalizePluginName } = require('../util/helper');

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
        module: require(path),
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
        version: '*',
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
      const path = pluginConfig.getInfo('path');
      const name = pluginConfig.getInfo('name');
      let pkg;

      try {
        /* eslint-disable global-require, import/no-dynamic-require */
        pkg = require(libPath.join(path, 'package.json'));
      } catch (e) {
        pkg = {};
      }
      return {
        name,
        path,
        module: require(path),
        version: pkg.version,
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
      const name = pluginConfig.getInfo('name');
      const installOptions = {
        path: config.get('root'),
        npmLoad: {
          prefix: config.get('root'),
        },
      };
      const path = pluginConfig.getInfo('path');

      if (path === undefined) {
        const targetVersion = await getSatisfiedVersion(name, pluginConfig.getInfo('version'));
        if (!targetVersion) {
          // @TODO
          const matchedPackageVersion = await listMatchedPackageVersion(name);
          throw Error(
            'unmatched plugin version, please use other version\n'

                          + `${matchedPackageVersion.join('\n')}`,
          );
        } else {
          installOptions.name = normalizePluginName(name);
          installOptions.version = targetVersion;
        }
      } else {
        // local install
        installOptions.name = path;
        installOptions.localInstall = true;
      }

      const installRet = await install(installOptions);

      let pkg;
      const requirePath = libPath.join(path || installRet.path, 'package.json');
      try {
        pkg = requireEnsure(requirePath);
      } catch (e) {
        pkg = {};
      }
      return {
        name,
        path: path || installRet.path,
        module: requireEnsure(path || installRet.path),
        version: pkg.version,
        pluginConfig,
      };
    },
  },
];

function getLoader(plugin) {
  if (typeof plugin.loader === 'function') return plugin.loader;

  return loaders.find(loader => loader.test(plugin));
}

module.exports = { getLoader };
