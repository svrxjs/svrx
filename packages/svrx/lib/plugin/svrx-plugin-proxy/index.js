const request = require('co-request');
const getRawBody = require('raw-body');
const libUrl = require('url');
const _ = require('lodash');
const micromatch = require('micromatch');
const { logger } = require('svrx-util');
const { gunzip } = require('../../util/gzip');
const { isHtmlType, isRespGzip } = require('../../util/helper');
const { PRIORITY } = require('../../constant');

const BLOCK_RESPONSE_HEADERS = ['content-security-policy', 'transfer-encoding'];
const match = (url, config) => {
  const wildcardAndGlobMatch = (str, pattern) => {
    if (_.isString(pattern) && str.startsWith(pattern)) return true;
    if (_.isArray(pattern) && pattern.some(p => str.startsWith(p))) return true;
    return micromatch.isMatch(str, pattern);
  };

  if (_.isPlainObject(config)) {
    const matchedPattern = _.keys(config).find(pattern => wildcardAndGlobMatch(url, pattern));
    return config[matchedPattern];
  }
  if (_.isArray(config)) {
    return config.find((conf) => {
      if (_.isString(conf.context)) return wildcardAndGlobMatch(url, conf.context);
      if (_.isArray(conf.context)) return wildcardAndGlobMatch(url, conf.context);
      return conf.context === undefined; // no context supplied will
      // match any path
    });
  }
  return null;
};
const rewritePath = (path, rules) => {
  const matchedRule = _.keys(rules).find((rule) => {
    const reg = new RegExp(rule);
    return path.match(reg);
  });
  if (matchedRule) {
    const reg = new RegExp(matchedRule);
    return path.replace(reg, rules[matchedRule]);
  }
  return path;
};

async function proxy({ proxyRule, ctx }) {
  const {
    target, pathRewrite, changeOrigin, secure = true,
  } = proxyRule;
  const path = rewritePath(ctx.originalUrl, pathRewrite);
  const urlObj = new libUrl.URL(path, target);
  const { headers } = ctx;
  const getBody = async () => {
    try {
      return /POST|PUT/.test(ctx.method)
        ? await getRawBody(ctx.req)
        : ctx.request.body;
    } catch (e) {
      logger.error(`Proxy Error: ${e.message}`);
      return '';
    }
  };
  const body = await getBody();

  headers.host = changeOrigin ? urlObj.hostname : headers.host;

  const options = {
    method: ctx.method,
    url: urlObj.toString(),
    body: body || '',
    encoding: null,
    followRedirect: false,
    headers,
    strictSSL: secure,
  };

  const rsp = await request(options);
  Object.keys(rsp.headers)
    .filter(item => BLOCK_RESPONSE_HEADERS.indexOf(item) === -1)
    .forEach(item => ctx.set(item, rsp.headers[item]));

  const isGzipHtml = isRespGzip(rsp.headers) && isHtmlType(rsp.headers);
  if (isGzipHtml) {
    rsp.body = await gunzip(rsp.body);
    ctx.set('content-encoding', 'identity');
  }

  ctx.status = rsp.statusCode;
  ctx.body = rsp.body;
}

module.exports = {
  priority: PRIORITY.PROXY,
  hooks: {
    async onCreate({ middleware, config }) {
      const proxyConfig = config.get('proxy');
      if (proxyConfig) {
        if (_.isArray(proxyConfig)) {
          proxyConfig.forEach((conf) => {
            logger.debug(`Proxy created: ${JSON.stringify(conf.context)}  ->  ${conf.target}`);
          });
        }
        if (_.isPlainObject(proxyConfig)) {
          _.keys(proxyConfig).forEach((key) => {
            logger.debug(`Proxy created: ${key}  ->  ${proxyConfig[key].target}`);
          });
        }
      }

      // add proxy api to ctx
      middleware.add('$proxy.api', {
        priority: PRIORITY.MOCK + 1,
        onCreate: () => async (ctx, next) => {
          ctx.proxy = async (context, proxyRule) => {
            await proxy({
              ctx: context,
              proxyRule,
            });
          };
          return next();
        },
      });
    },

    async onRoute(ctx, next, { config }) {
      const proxyConfig = config.get('proxy');

      if (!proxyConfig) {
        await next();
        return;
      }

      const proxyRule = match(ctx.url, proxyConfig);

      if (!proxyRule) {
        await next();
        return;
      }

      await proxy({ proxyRule, ctx });
    },
  },
};
