const request = require('co-request');
const path = require('path');

module.exports = {
    priority: 9,

    onCreate(config) {
        const proxyConfig = config.get('proxy');

        return async (ctx, next) => {
            if (!proxyConfig) return next();

            if (proxyConfig.match && !proxyConfig.match(ctx.url)) {
                return next();
            }

            const rsp = await proxy({
                target: proxyConfig.target,
                host: proxyConfig.host,
                ctx
            });

            // @TODO:  unzip content, make it easy to modify
            // const isGzipped = rsp.headers['content-encoding'] === 'gzip';

            ctx.status = rsp.statusCode;

            Object.keys(rsp.headers)
                .filter((item) => item !== 'transfer-encoding')
                .forEach((item) => ctx.set(item, rsp.headers[item]));

            ctx.body = rsp.body;

            await next();
        };
    }
};

// 简化版 request
async function proxy({ target, ctx, host }) {
    let url = path.join(target, ctx.originalUrl);
    let headers = ctx.headers;
    let req = ctx.request;

    headers.host = host || target || headers.host;

    const options = {
        method: ctx.method,
        url: `${ctx.protocol}://${url}`,
        body: req.body || '',
        encoding: null,
        headers
    };

    return request(options);
}
