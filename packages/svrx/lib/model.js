const { produce } = require('immer');
const TARGET_KEY = Symbol('target');

const im = require('./util/im');

class ImmutableModel {
    constructor(target) {
        this[TARGET_KEY] = Object.assign({}, target || {});
    }

    // immer.produce
    produce(modifier) {
        this[TARGET_KEY] = produce(this[TARGET_KEY], modifier);
        return this;
    }

    set(...args) {
        args.unshift(this[TARGET_KEY]);
        this[TARGET_KEY] = im.set.apply(im, args);
        return this;
    }

    /**
     * get(state, 'path.left,name')
     * 避免 undefined of undefined 错误
     */
    get(pathes) {
        return im.get(this[TARGET_KEY], pathes);
    }

    splice(...args) {
        args.unshift(this[TARGET_KEY]);
        this[TARGET_KEY] = im.splice.apply(im, args);
        return this;
    }

    del(pathes) {
        this[TARGET_KEY] = im.del(this[TARGET_KEY], pathes);
    }
}

module.exports = ImmutableModel;
