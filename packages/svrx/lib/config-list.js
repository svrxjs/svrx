const { GROUPS } = require('./constant');

module.exports = {
    root: {
        type: 'string',
        default: process.cwd(),
        description: 'where to start svrx',
        defaultHint: 'default to the current working directory',
        group: GROUPS.CORE,
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
        description: 'the version of svrx you want to use',
        defaultHint: 'default to the latest published version of svrx',
        group: GROUPS.CORE,
        ui: false
    },
    port: {
        alias: 'p',
        type: 'number',
        default: 8000,
        description: 'the unique identifier for a product',
        group: GROUPS.CORE
    },
    https: {
        type: 'boolean',
        group: GROUPS.CORE
    },
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
    middlewares: {
        type: 'array',
        group: GROUPS.CORE
    },

    // built plugin configs
    serve: {
        group: GROUPS.COMMON,
        default: true,
        anyOf: [
            {
                type: 'boolean'
            },
            {
                type: 'object',
                properties: {
                    base: {
                        type: 'string',
                        description: 'where to serve content from',
                        defaultHint: 'default to the current working directory(root)'
                    },
                    headers: {
                        type: 'object',
                        default: {},
                        description: 'add headers to all responses'
                    }
                }
            }
        ],
        errorMessage: 'should be boolean or object'
    },

    proxy: {
        group: GROUPS.COMMON,
        anyOf: [
            {
                type: 'object'
            },
            {
                type: 'array'
            }
        ],
        errorMessage: 'should be array or object'
    },

    livereload: {
        description: 'enable auto live reload',
        group: GROUPS.COMMON,
        default: true,
        anyOf: [
            {
                type: 'boolean'
            },
            {
                type: 'object',
                properties: {
                    exclude: {
                        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                        errorMessage: 'should be string or array of string'
                    }
                }
            }
        ],
        errorMessage: 'should be boolean or object'
    },

    cors: {
        description: 'Cross-Origin Resource Sharing(CORS)',
        group: GROUPS.COMMON,
        default: true,
        anyOf: [
            {
                type: 'boolean'
            },
            {
                type: 'object'
            }
        ],
        errorMessage: 'should be boolean or object'
    }
};
