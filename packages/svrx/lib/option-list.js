const { GROUPS } = require('./constant');

module.exports = {
    version: {
        type: 'string',
        description: "The version of svrx you want to use(default to 'latest' if not present)",
        group: GROUPS.COMMON,
        alias: 'v'
    },
    port: {
        type: 'number',
        description: 'The unique identifier for a product',
        default: 8000,
        group: GROUPS.COMMON,
        alias: 'p',
        ui: true // export to ui
    },
    reload: {
        type: 'boolean',
        description: 'Enable auto reload',
        default: true,
        ui: true
    }
    // dir: {}
};
