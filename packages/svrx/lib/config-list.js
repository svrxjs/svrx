const { GROUPS } = require('./constant');

module.exports = {
    urls: {
        type: 'object',
        properties: {
            style: {
                type: 'string',
                default: '/svrx/svrx-client.css',
                group: GROUPS.CORE,
                cli: false,
                ui: false
            },
            script: {
                type: 'string',
                default: '/svrx/svrx-client.js',
                group: GROUPS.CORE,
                cli: false,
                ui: false
            }
        }
    },
    root: {
        type: 'string',
        default: process.cwd(),
        group: GROUPS.CORE,
        cli: false,
        ui: false
    },
    dir: {
        type: 'string',
        default: process.cwd(),
        group: GROUPS.CORE,
        cli: false,
        ui: false
    },
    svrx: {
        // todo default to the latest at local
        alias: 'v',
        type: 'string',
        description: "The version of svrx you want to use(default to 'latest' if not present)",
        group: GROUPS.COMMON,
        ui: false
    },
    port: {
        alias: 'p',
        type: 'number',
        default: 8000,
        description: 'The unique identifier for a product',
        group: GROUPS.COMMON
    },
    livereload: {
        group: GROUPS.COMMON,
        description: 'Enable auto live reload',
        antOf: [
            {
                type: 'boolean',
                default: true
            },
            {
                type: 'object',
                properties: {
                    exclude: { type: 'string' }
                }
            }
        ]
    },
    https: {
        type: 'boolean'
    },
    static: {
        type: 'object',
        properties: {
            root: { type: 'string' }
        }
    },
    middlewares: {
        type: 'array'
    }
};
