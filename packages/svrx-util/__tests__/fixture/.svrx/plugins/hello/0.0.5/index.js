module.exports = {
  name: 'hello',
  priority: 100,
  options: {
    limit: {
      type: 'number',
      default: 5,
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
