const { fork } = require('child_process');
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
      const root = config.get('root');
      const version = pluginConfig.getInfo('version');
      const path = pluginConfig.getInfo('path');
      const registry = config.get('registry');


      const task = fork(libPath.join(__dirname, './task.js'), {
        silent: true,
      });


      const installRet = await new Promise((resolve, reject) => {
        task.on('error', reject);
        task.on('message', (ret) => {
          if (ret.error) reject(new Error(ret.error));
          else resolve(ret);
        });
        task.send({
          path, name, root, version, registry,
        });
      });

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
  if (typeof plugin.getInfo('load') === 'function') return plugin.getInfo('load');

  return loaders.find(loader => loader.test(plugin)).load;
}

module.exports = { getLoader };
