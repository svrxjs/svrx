module.exports = {
    name: 'no-package',
    hooks: {
      async onRoute(ctx, next, { config }) {
        const limit = config.get('limit');
        ctx.set('X-Svrx-Limit', limit);
        await next();
      },
    },
  };
  