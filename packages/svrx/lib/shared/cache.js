// avoid oom
function limitCache(option) {
  option = option || {};

  const keys = [];
  const limit = option.limit || 100;
  const onError = option.onError;
  const cache = {};

  return {
    set(key, value) {
      if (keys.length > limit) {
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
    },
    get(key) {
      return cache[key];
    },
    del(key) {
      delete cache[key];
      for (let len = keys.length; len--;) {
        if (keys[len] === key) {
          keys.splice(len, 1);
        }
      }
    },
    values() {
      return keys.map(key => cache[key]);
    },
    size() {
      return keys.length;
    },
  };
}

module.exports = limitCache;
