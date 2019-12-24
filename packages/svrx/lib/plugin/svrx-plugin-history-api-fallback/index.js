const historyApiFallback = require('koa-history-api-fallback');
const { PRIORITY } = require('../../constant');

module.exports = {
  priority: PRIORITY.HISTORY_API_FALLBACK,
  hooks: {
    async onRoute(ctx, next, { config }) {
      const historyApiFallbackOptions = config.get('historyApiFallback');

      if (historyApiFallbackOptions === false) return next();
      const historyApiFallbackMiddleware = historyApiFallback(
        historyApiFallbackOptions === true ? {} : historyApiFallbackOptions,
      );

      if (ctx.status !== 404) {
        return next();
      }
      return historyApiFallbackMiddleware(ctx, next);
    },
  },
};
