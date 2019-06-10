const _ = require('lodash');
const proxy = require('http-proxy-middleware');
const k2c = require('koa2-connect');
const compose = require('koa-compose');
const { PRIORITY } = require('../../constant');

module.exports = {
    priority: PRIORITY.PROXY,
    hooks: {
        async onCreate({ middleware, config }) {
            const proxyConfig = config.get('proxy');

            if (!proxyConfig) return;

            const formattedConfig = _.isPlainObject(proxyConfig)
                ? _.keys(proxyConfig).map((k) => ({ context: k, ...proxyConfig[k] }))
                : proxyConfig;

            const proxyMiddleware = compose(formattedConfig.map((conf) => k2c(proxy(conf.context, conf))));

            middleware.add('$proxy', {
                priority: PRIORITY.PROXY,
                onCreate: () => async (ctx, next) => proxyMiddleware(ctx, next)
            });
        }
    }
};
