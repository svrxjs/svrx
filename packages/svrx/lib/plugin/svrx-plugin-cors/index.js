const cors = require('koa2-cors');
const { PRIORITY } = require('../../constant');

module.exports = {
  priority: PRIORITY.CORS,
  hooks: {
    async onRoute(ctx, next, { config }) {
      const corsConfig = config.get('cors');
      if (corsConfig === false) {
        return next();
      }

      const corsMiddleware = cors(corsConfig === true ? {} : corsConfig);
      return corsMiddleware(ctx, next);
    },
  },
};
