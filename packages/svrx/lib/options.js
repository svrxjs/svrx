const { GROUPS } = require('./constant');
module.exports = {
    port: {
        type: 'number',
        description: 'The unique identifier for a product',
        default: 8000,
        group: GROUPS.COMMON,
        alias: 'p',
        required: true,
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
