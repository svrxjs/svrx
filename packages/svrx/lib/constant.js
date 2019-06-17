const libPath = require('path');

const CORE = 'Core';
const COMMON = 'Common';
const GROUPS = {
    CORE,
    COMMON
};

module.exports = {
    PLUGIN_PREFIX: 'svrx-plugin-',

    PRIORITY: {
        DEFAULT: 10,
        SERVE: 20,
        PROXY: 21,
        TRANSFORM: 100,
        INJECTOR: 101
    },

    ASSET_FIELDS: ['script', 'style'],
    // REMOVE POSTFIX like `-beta` in  0.0.1-beta.
    VERSION: require(libPath.join(__dirname, '../package.json')).version.replace(/-.*$/, ''),
    BUILTIN_PLUGIN: ['livereload', 'proxy', 'serve', 'cors'],
    CUSTOM_SCHEMA_TYPES: ['compute', 'function'],
    GROUPS
};
