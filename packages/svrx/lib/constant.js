const libPath = require('path');
module.exports = {
    PLUGIN_PREFIX: 'svrx-plugin-',

    PRIORITY: {
        DEFAULT: 10,
        INJECTOR: 1001,
        SERVE: 200,
        PROXY: 100,
        TRANSFORM: 1000
    },

    ASSET_FIELDS: ['script', 'style'],
    // REMOVE POSTFIX like `-beta` in  0.0.1-beta.
    VERSION: require(libPath.join(__dirname, '../package.json')).version.replace(/-.*$/, '')
};
