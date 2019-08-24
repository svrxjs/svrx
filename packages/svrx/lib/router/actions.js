
const { simpleRender } = require('../util/helper');
const cache = require('../shared/cache');

const MAX_LIMIT_ACTIONS = 200;
const actionCache = cache({
  limit: MAX_LIMIT_ACTIONS,
});

module.exports = actionCache;


actionCache.set({
  handle: (middleware) => middleware,
  send: (param, code) => (ctx) => {
    ctx.body = param;
    if (typeof code === 'number') {
      ctx.status = code;
    }
  },
  json: (param) => (ctx) => {
    ctx.body = JSON.stringify(param, null, 2);
    ctx.type = 'json';
  },
  header: (headers) => (ctx, next) => {
    ctx.set(headers);
    return next();
  },
  redirect: (target) => (ctx) => {
    ctx.redirect(simpleRender(target, ctx.params));
  },
  rewrite: (target) => async (ctx, next) => {
    const original = ctx.url;
    ctx.path = simpleRender(target, ctx.params);
    await next();
    ctx.path = original;
  },
});
