const request = require('co-request');
const libUrl = require('url');
const { gunzip } = require('../../util/gzip');
const { isHtmlType, isRespGzip } = require('../../util/helper');

const { PRIORITY } = require('../../constant');

module.exports = {
    priority: PRIORITY.PROXY,

    hooks: {
        async onRoute(ctx, next, { config }) {
            const proxyConfig = config.get('proxy');

            if (!proxyConfig) return next();

            if (proxyConfig.match && !proxyConfig.match(ctx.url)) {
                return next();
            }

            const rsp = await proxy({
                target: proxyConfig.target,
                host: proxyConfig.host,
                ctx
            });

            const isGzipHtml = isRespGzip(rsp.headers) && isHtmlType(rsp.headers);
            if (isGzipHtml) {
                rsp.body = await gunzip(rsp.body);
            }

            // @TODO:  unzip content, make it easy to modify
            // const isGzipped = rsp.headers['content-encoding'] === 'gzip';

            ctx.status = rsp.statusCode;

            Object.keys(rsp.headers)
                .filter((item) => item !== 'transfer-encoding')
                .forEach((item) => ctx.set(item, rsp.headers[item]));

            ctx.body = rsp.body;
            if (isGzipHtml) {
                ctx.set('content-encoding', 'identity');
            }

            await next();
        }
    }
};

// 简化版 request
async function proxy({ target, ctx, host }) {
    let urlObj = new libUrl.URL(ctx.originalUrl, target);
    let headers = ctx.headers;
    let req = ctx.request;

    headers.host = host || urlObj.hostname || headers.host;

    console.log(headers.host, urlObj);

    const options = {
        method: ctx.method,
        url: urlObj.toString(),
        body: req.body || '',
        encoding: null,
        headers
    };

    return request(options);
}
