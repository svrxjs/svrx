// service static middleware

const send = require('koa-send');

const { noopMiddleware } = require('../../util/helper');

const ACCEPT_METHOD = /^(?:GET|HEAD)$/i;

module.exports = {
    priority: 100,
    // bind with logic
    onCreate(config) {
        const staticConfig = config.get('static');

        if (!staticConfig) return noopMiddleware;

        return async (ctx, next) => {
            // static first
            await next();

            if (!ACCEPT_METHOD.test(ctx.method) || ctx.status !== 404 || ctx.body != null) {
                return;
            }

            try {
                await send(
                    ctx,
                    ctx.path,
                    Object.assign(
                        {
                            gzip: false
                        },
                        staticConfig
                    )
                );
            } catch (err) {
                if (err.status !== 404) {
                    throw err;
                }
            }
        };
    }
};
