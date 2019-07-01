/**
 * Forked From koajs/compose
 * License MIT
 *
 * https://github.com/koajs/compose
 * @koajs
 */

const logger = require('./logger');

function compose(middleware, keys) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!');

  middleware.forEach((fn) => {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!');
  });

  return function composedMiddleware(context, next) {
    let index = -1;
    const enterTime = Date.now();
    const stack = [];

    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      const len = middleware.length;
      if (i < len) stack.push(`before [${keys[i]}]`);
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1))).then(
          (ret) => {
            if (i < len) stack.push(`after [${keys[i]}]`);
            return ret;
          },
        );
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0).then((ret) => {
      logger.debug(
        `${context.url} - ${Date.now() - enterTime}ms \n ${stack.join(' -> ')}`,
      );
      return ret;
    });
  };
}
module.exports = compose;
