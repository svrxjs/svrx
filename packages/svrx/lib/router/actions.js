
const pathToRegexp = require('path-to-regexp');
const cache = require('../shared/cache');

const MAX_LIMIT_ACTIONS = 1000;
const actionCache = module.exports = cache({
  limit: MAX_LIMIT_ACTIONS,
  onError() {
    throw Error('max route action size limit exceeded');
  },
});


actionCache.set({
  send: (param, code) => (ctx, next) => {
    ctx.body = param;
    if (typeof code === 'number') {
      ctx.status = code;
    }
  },
  redirect: (location, code) => (ctx, next) => {
    ctx.status = code;
    ctx.redirect(location);
  },
  json: param => (ctx, next) => {
    ctx.body = JSON.stringify(param, null, 2);
    ctx.type = 'json';
  },
  header: headers => (ctx, next) => {
    ctx.set(headers);
    return next();
  },
  rewrite: (target) => {
    const toPath = pathToRegexp.compile(target);
    return (ctx, next) => {
      ctx.url = toPath(ctx.params);
      return next();
    };
  },
});
