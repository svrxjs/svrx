const actionCache = require('./actions');

module.exports = {
  Loader: require('./loader'),
  Router: require('./router'),
  Route: require('./route'),
  registAction: (name, handler) => {
    actionCache.set(name, handler);
  },
};
