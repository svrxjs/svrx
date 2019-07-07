
module.exports = {
  name: 'test',
  priority: 100,
  options: {
    limit: {
      type: 'number',
      default: 100,
    },
  },
  assets: {
    style: ['./assets/index.css'],
    script: ['./assets/index.js'],
  },
  hooks: {
    async onRoute(ctx, next, { config }) {
      const limit = config.get('limit');
      ctx.set('X-Svrx-Limit', limit);
      await next();
    },
  },
};
