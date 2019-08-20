
// avoid oom
function limitCache(option) {
  if (typeof option === 'number') option = { limit: option };

  option = option || {};

  const keys = [];
  const limit = option.limit || 100;
  const { onError } = option;
  const cache = {};

  /* eslint-disable consistent-return */
  function set(key, value) {
    if (typeof key === 'object') {
      Object.keys(key).forEach((i) => {
        set(i, key[i]);
      });
      return;
    }
    if (keys.length >= limit) {
      if (onError) {
        return onError();
      }
      throw Error('max cache size limit exceeded');
    }
    //
    if (cache[key] === undefined) {
      keys.push(key);
    }

    cache[key] = value;
    return value;
  }
  return {
    set,
    get(key) {
      return cache[key];
    },
    del(key) {
      delete cache[key];
      for (let len = keys.length - 1; len >= 0; len -= 1) {
        if (keys[len] === key) {
          keys.splice(len, 1);
        }
      }
    },
    values() {
      return keys.map((key) => cache[key]);
    },
    keys() {
      return keys.slice();
    },
    size() {
      return keys.length;
    },
  };
}

module.exports = limitCache;
