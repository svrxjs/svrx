
module.exports = {
  name: 'depend',
  priority: 100,
  configSchema: {
    limit: {
      type: 'number',
      default: 100,
    },
  },
  hooks: {
    async onRoute(ctx, next, { config }) {
      const limit = config.get('limit');
      ctx.set('X-Svrx-Limit', limit);
      await next();
    },
  },
};
