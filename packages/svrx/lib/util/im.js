

let _ = require('./helper');


// simple immutable utility
// ------------------------------ 
// - set: deep set
// - get: deep get
// - del: deep del
// - splice: deep array splice mani
let im = {

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

        let currentVal = im.get(target, pathes);
        if ( !options.replace && currentVal === val ) {
            return target;
        }

        // if (options.delete) {
        //     if (val === undefined || val === null || (_.typeOf(val) === 'array' && val.length === 0)) {
        //         return im.del(target, pathes);
        //     }
        // } else if (val === undefined && !options.forceSet) {
        //     return im.del(target, pathes);
        // }

        let { replace } = options;

        let tType = _.typeOf(target);
        let aType = _.typeOf(val);
        let len = pathes.length;

        if (!len) {
            return !replace && (tType === 'object' && aType === 'object') ?
                Object.assign({}, target, val) : val;
        }

        let nextPath = pathes.shift();
        let dest = _.clone(target);

        if ( dest === undefined && !options.noCreate ) {
            dest = {};
        }

        if (len === 1) { // 证明是最后一个
            if (dest[nextPath] === val) {
                return dest;
            }
        }
        dest[nextPath] = im.set(dest[nextPath], pathes, val, options);

        return dest;
    },

    /**
     * get(state, 'path.left,name')
     * 避免 undefined of undefined 错误
     */
    get(target, pathes) {
        if (typeof pathes === 'number') pathes = [pathes];
        else if (typeof pathes === 'string') pathes = pathes.split('.');
        target && pathes.some((p) => {
            target = target[p];
            if (target == null) return true;
            return false;
        });
        return target;
    },

    splice(target, pathes, ...args) {
        let list = im.get(target, pathes).slice();
        list.splice.call(list, ...args);
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

        let len = pathes.length;

        let dest = _.clone(target);
        if (!len) {
            return dest;
        }

        let nextPath = pathes.shift();
        let tType = _.typeOf(target);

        if (len === 1) {
            if (tType === 'object') {
                delete dest[nextPath];
                return dest;
            } else if (tType === 'array') {
                dest.splice(parseInt(nextPath, 10), 1);
                return dest;
            }
            return dest;
        }
        dest[nextPath] = im.del(dest[nextPath], pathes);
        return dest;
    },

};

module.exports = im;
