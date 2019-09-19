const _ = require('./helper');

// simple immutable utility
// ------------------------------
// - set: deep immutable set
// - get: deep get
// - del: deep immutable del
// - splice: deep immutable array splice mani
const im = {
  /**
     *
     * @param {Object} options
     *  - options.replace
     *  - options.noCreate: if true, won't create raw object for undefined
     */
  set(target, pathes, val, options = {}) {
    if (options === true) {
      options = { replace: true };
    }

    if (typeof pathes === 'number') pathes = [pathes];
    else if (typeof pathes === 'string') pathes = pathes.split('.');
    pathes = pathes || [];

    const currentVal = im.get(target, pathes);
    if (!options.replace && currentVal === val) {
      return target;
    }

    const { replace } = options;

    const tType = _.typeOf(target);
    const aType = _.typeOf(val);
    const len = pathes.length;

    if (!len) {
      return !replace && (tType === 'object' && aType === 'object') ? ({ ...target, ...val }) : val;
    }

    const nextPath = pathes.shift();
    let dest = _.clone(target);

    if (dest === undefined && !options.noCreate) {
      dest = {};
    }

    if (len === 1) {
      // 证明是最后一个
      if (dest[nextPath] === val) {
        return dest;
      }
    }
    dest[nextPath] = im.set(dest[nextPath], pathes, val, options);

    return dest;
  },

  /**
     * get(state, 'path.left,name')
     * avoid undefined of undefined 错误
     */
  get(target, pathes) {
    if (typeof pathes === 'number') {
      pathes = [pathes];
    } else if (typeof pathes === 'string') {
      pathes = pathes.split('.');
    }
    if (target && pathes) {
      pathes.some((p) => {
        target = target[p];
        return target == null;
      });
    }
    return target;
  },

  splice(target, pathes, ...args) {
    const list = im.get(target, pathes).slice();
    list.splice(...args);
    return im.set(target, pathes, list, true);
  },

  del(target, pathes) {
    if (!target) {
      return target;
    }
    if (typeof pathes === 'number') {
      pathes = [pathes];
    } else if (typeof pathes === 'string') {
      pathes = pathes.split('.');
    }

    pathes = pathes || [];

    const len = pathes.length;

    if (!len) {
      return target;
    }

    const dest = _.clone(target);

    const nextPath = pathes.shift();
    const tType = _.typeOf(target);

    if (len === 1) {
      if (tType === 'object') {
        delete dest[nextPath];
        return dest;
      } if (tType === 'array') {
        dest.splice(parseInt(nextPath, 10), 1);
        return dest;
      }
      return dest;
    }
    dest[nextPath] = im.del(dest[nextPath], pathes);
    return dest;
  },
  equal(state1, state2, pathes) {
    if (!pathes) return state1 === state2;
    return im.get(state1, pathes) === im.get(state2, pathes);
  },
};

module.exports = im;
