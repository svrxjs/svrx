const noop = require('lodash.noop');

module.exports = {
    name: 'test',
    priority: 100,
    propModels: {
        limit: {
            type: 'number',
            defaultValue: 100
        }
    },
    assets: {
        style: [
            './assets/index.css'
        ],
        script: [
            './assets/index.js'
        ]
    },
    hooks: {
        async onRoute( props, ctx, next ){
            const limit = props.limit;
            ctx.set('X-Svrx-Limit', limit);
            await next()
        }
    }
}