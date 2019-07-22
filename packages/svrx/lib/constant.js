const libPath = require('path');

const CORE = 'Core';
const COMMON = 'Common';
const GROUPS = {
  CORE,
  COMMON,
};

module.exports = {
  PLUGIN_PREFIX: 'svrx-plugin-',

  PRIORITY: {
    SERVE: 8,
    DEFAULT: 10,
    HISTORY_API_FALLBACK: 20,
    PROXY: 21,
    MOCK: 30,
    TRANSFORM: 100,
    INJECTOR: 101,
  },

  ASSET_FIELDS: ['script', 'style'],
  // REMOVE POSTFIX like `-beta` in  0.0.1-beta.
  /* eslint-disable global-require, import/no-dynamic-require */
  VERSION: require(libPath.join(__dirname, '../package.json')).version.replace(/-.*$/, ''),
  BUILTIN_PLUGIN: ['livereload', 'proxy', 'serve', 'cors', 'open'],
  CUSTOM_SCHEMA_TYPES: ['compute', 'function'],
  GROUPS,
  EVENTS: {
    FILE_CHANGE: 'file:change',
    CREATE: 'create',
    READY: 'ready',
  },
};
