const compose = require('../util/compose');
const methods = require('./methods');
const Route = require('./route');


class Router {
  constructor() {
    this._routes = [];
    this.commands = {};
    this._initMethod();
  }

  _initMethod() {
    const { commands } = this;
    commands.route = this.route.bind(this);
    methods.forEach((method) => {
      commands[method] = (selector) => this.route(selector, method === 'del' ? 'delete' : method);
    });
    commands.all = (selector) => this.route(selector);
  }

  middleware() {
    const routes = this._routes;
    return compose(routes.map((route) => (ctx, next) => {
      const params = route.exec(ctx.path, ctx.method);
      if (params) {
        ctx.params = params;
        return route.middleware()(ctx, next);
      }
      return next();
    }));
  }

  route(selector, method) {
    const route = new Route({ selector, method });
    this._routes.push(route);
    return route;
  }
}


module.exports = Router;
Router.Route = Route;
