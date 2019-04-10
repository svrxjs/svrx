// safe listening port
const nPath = require('path');
const CONST = require('../constant')
const o2str = ({}).toString;
const slice = [].slice;


// return promise by callback node-callback-style handler
function npCall( callback, args, ctx ) {

    args = args || [];

    return new Promise((resolve, reject) => {

        args.push((err, ret) => {
            if (err) return reject( err )
            return resolve(ret);
        })

        callback.apply(ctx, args)
    })
}


function normalizePluginName(name) {

    return name.indexOf( CONST.PLUGIN_PREFIX ) !== 0?
        CONST.PLUGIN_PREFIX + name:
        name

}

function typeOf( o ){
    return o == null ? String(o) : o2str.toString.call(o).slice(8, -1).toLowerCase();
}

// 浅复制
function clone(target) {
    const type = typeOf( target );

    if (type === 'array') {
        return slice.call(target);
    }
    if (type === 'object') {
        return Object.assign({}, target);
    }
    return target;
}


exports.normalizePluginName = normalizePluginName
exports.npCall = npCall
exports.typeOf = typeOf
exports.clone = clone
