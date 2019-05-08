// avoid oom
function limitCache(option) {
    option = option || {};

    var keys = [];
    var limit = option.limit || 100;
    var onError = option.onError;
    var cache = {};

    return {
        set: function(key, value) {
            if (keys.length > limit) {
                if (onError) {
                    return onError();
                } else {
                    throw Error('max cache size limit exceeded');
                }
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
            for (var len = keys.length; len--; ) {
                if (keys[len] === key) {
                    keys.splice(len, 1);
                }
            }
        },
        values() {
            return keys.map((key) => cache[key]);
        },
        size() {
            return keys.length;
        }
    };
}

module.exports = limitCache;
