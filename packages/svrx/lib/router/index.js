const actionCache = require('./actions');
const Loader = require('./loader');
const Router = require('./router');
const Route = require('./route');

module.exports = {
  Loader,
  Router,
  Route,
  exportsToPlugin(loader) {
    return {
      action(name, handler) {
        actionCache.set(name, handler);
      },
      route(handler) {
        const router = new Router();
        handler(router.commands);
        loader.add(router);
      },
      load: loader.load.bind(loader),

    };
  },
};
