const pathToRegexp = require('path-to-regexp');
const compose = require('../util/compose');
const actionCache = require('./actions');


class Route {
  constructor({ selector, method }) {
    this.method = method || 'all';
    this.selector = selector;
    if (!selector) throw Error('selector is needed');
    this.keys = [];
    this.actions = [];
    this.regexp = pathToRegexp(this.selector, this.keys);
    this._injectAction();
  }

  _injectAction() {
    const keys = actionCache.keys();
    const { actions } = this;
    keys.forEach((key) => {
      const handler = actionCache.get(key);
      this[key] = (...args) => {
        actions.push({
          handler,
          args,
        });
        return this;
      };
    });
  }

  exec(url, method) {
    const { keys } = this;
    if (method.toLowerCase() !== this.method && this.method !== 'all') {
      return null;
    }
    const matched = this.regexp.exec(url);
    if (!matched) return null;
    return keys.reduce((param, right, idx) => {
      param[right.name] = matched[idx + 1];
      return param;
    }, {});
  }

  middleware() {
    const { actions } = this;
    const steps = [];
    for (let i = 0, len = actions.length; i < len; i += 1) {
      const action = actions[i];
      if (typeof action.handler === 'function') {
        steps.push(action.handler(...action.args));
      }
    }
    return compose(steps);
  }

  get to() {
    return this;
  }
}

module.exports = Route;
