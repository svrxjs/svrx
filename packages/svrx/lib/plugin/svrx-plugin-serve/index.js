// service static middleware

const send = require('koa-send');
const c2k = require('koa2-connect');
const serveIndex = require('serve-index');

const { PRIORITY } = require('../../constant');

const ACCEPT_METHOD = /^(?:GET|HEAD)$/i;

module.exports = {
    priority: PRIORITY.SERVE,
    // bind with logic
    hooks: {
        async onCreate({ middleware, config }) {
            middleware.add('$serve-index', {
                onCreate: () => c2k(serveIndex(config.get('root'), { icons: true }))
            });
        },
        async onRoute(ctx, next, { config }) {
            await next();

            if (!ACCEPT_METHOD.test(ctx.method) || ctx.status !== 404 || ctx.body != null) {
                return;
            }

            let staticConfig = config.get('static');

            if (staticConfig === false) {
                return;
            }

            const root = config.get('static.root') || config.get('root');

            try {
                await send(ctx, ctx.path, { gzip: false, root });
            } catch (err) {
                if (err.status !== 404) {
                    throw err;
                }
            }
        }
    }
};
