const libPath = require('path');

const COMMON = 'Common';
const GROUPS = {
    COMMON
};

module.exports = {
    PLUGIN_PREFIX: 'svrx-plugin-',

    PRIORITY: {
        DEFAULT: 10,
        SERVE: 20,
        PROXY: 21,
        INJECTOR: 101,
        TRANSFORM: 100
    },

    ASSET_FIELDS: ['script', 'style'],
    // REMOVE POSTFIX like `-beta` in  0.0.1-beta.
    VERSION: require(libPath.join(__dirname, '../package.json')).version.replace(/-.*$/, ''),
    GROUPS
};
