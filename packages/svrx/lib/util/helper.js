// safe listening port
const EventEmitter = require('events');
const libPath = require('path');
const libFs = require('fs');
const _ = require('lodash');

const CONST = require('../constant');
const o2str = {}.toString;
const slice = [].slice;
const exec = require('child_process').exec;

async function noopMiddleware(ctx, next) {
    await next();
}

// return promise by callback node-callback-style handler
function npCall(callback, args, ctx) {
    args = args || [];

    return new Promise((resolve, reject) => {
        args.push((err, ret) => {
            if (err) return reject(err);
            return resolve(ret);
        });

        callback.apply(ctx, args);
    });
}

function normalizePluginName(name) {
    return name.indexOf(CONST.PLUGIN_PREFIX) !== 0 ? CONST.PLUGIN_PREFIX + name : name;
}

function isWritableStream(test) {
    // ducking type check
    return test instanceof EventEmitter && typeof test.write === 'function' && typeof test.end === 'function';
}
function isReadableStream(test) {
    // ducking type check
    return test instanceof EventEmitter && typeof test.read === 'function';
}

function typeOf(o) {
    return o == null
        ? String(o)
        : o2str
              .call(o)
              .slice(8, -1)
              .toLowerCase();
}

// simple clone
function clone(target) {
    const type = typeOf(target);

    if (type === 'array') {
        return slice.call(target);
    }
    if (type === 'object') {
        return Object.assign({}, target);
    }
    return target;
}

function openBrowser(target, callback) {
    const map = {
        darwin: 'open',
        win32: 'start '
    };

    const opener = map[process.platform] || 'xdg-open';

    return exec('' + opener + ' ' + target, callback);
}

function is(someThing) {
    return someThing;
}

const acceptMineTypes = /\b(xhtml|html|htm|xml)\b/;

function isHtmlType(headers) {
    return acceptMineTypes.test(headers['content-type'] || '');
}

function isAcceptGzip(headers) {
    return (headers['accept-encoding'] || '').indexOf('gzip') !== -1;
}

function isRespGzip(headers) {
    return (headers['content-encoding'] || '').indexOf('gzip') !== -1;
}

function getCert() {
    const read = (type) => {
        return libFs.readFileSync(libPath.join(__dirname, '../../resource/cert/rootCA.' + type), 'utf8');
    };
    return {
        cert: read('crt'),
        key: read('key')
    };
}

exports.normalizePluginName = normalizePluginName;
exports.isWritableStream = isWritableStream;
exports.isReadableStream = isReadableStream;
exports.noopMiddleware = noopMiddleware;
exports.getCert = _.memoize(getCert);
exports.isAcceptGzip = isAcceptGzip;
exports.openBrowser = openBrowser;
exports.isRespGzip = isRespGzip;
exports.isHtmlType = isHtmlType;
exports.typeOf = typeOf;
exports.npCall = npCall;
exports.clone = clone;
exports.is = is;
