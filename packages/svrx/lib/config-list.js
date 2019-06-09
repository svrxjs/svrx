const { GROUPS } = require('./constant');

module.exports = {
    root: {
        type: 'string',
        default: process.cwd(),
        description: 'Where to start svrx',
        defaultHint: 'Default to the current working directory',
        group: GROUPS.CORE,
        ui: false
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
        description: 'The version of svrx you want to use',
        defaultHint: 'Default to the latest published version of svrx',
        group: GROUPS.CORE,
        ui: false
    },
    port: {
        alias: 'p',
        type: 'number',
        default: 8000,
        description: 'The unique identifier for a product',
        group: GROUPS.CORE
    },

    https: {
        type: 'boolean'
    },

    middlewares: {
        type: 'array'
    },

    // built plugin configs

    serve: {
        group: GROUPS.COMMON,
        oneOf: [
            {
                type: 'boolean',
                default: true
            },
            {
                type: 'object',
                properties: {
                    base: {
                        type: 'string',
                        description: 'Where to serve content from',
                        defaultHint: 'Default to the current working directory(root)'
                    },
                    headers: {
                        type: 'object',
                        default: {},
                        description: 'Add headers to all responses'
                    }
                }
            }
        ],
        errorMessage: 'should be boolean or object'
    },

    // todo
    proxy: {
        group: GROUPS.COMMON,
        oneOf: [
            {
                type: 'boolean',
                default: true
            },
            {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        path: {
                            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                            errorMessage: 'should be string or array of string'
                        },
                        target: {
                            type: 'string'
                        }
                    }
                }
            }
        ],
        errorMessage: 'should be boolean or array of object'
    },

    livereload: {
        description: 'Enable auto live reload',
        group: GROUPS.COMMON,
        oneOf: [
            {
                type: 'boolean',
                default: true
            },
            {
                type: 'object',
                properties: {
                    exclude: {
                        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                        errorMessage: 'should be string or array of string'
                    }
                }
            }
        ],
        errorMessage: 'should be boolean or object'
    }
};
