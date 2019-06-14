// safe listening port
const EventEmitter = require('events');
const libPath = require('path');
const libFs = require('fs');
const _ = require('lodash');
const os = require('os');

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

// node callback style result
// ================================
// const [err, data] = await nodeCall( func, 1,2,3 );
function nodeCall(fnReturnPromise, ...args) {
    return new Promise((resolve) => {
        fnReturnPromise(...args)
            .then((data) => {
                resolve([null, data]);
            })
            .catch((err) => {
                resolve([err]);
            });
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
    if (o == null) {
        return String(o);
    }
    return o2str
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

function getExternalIp() {
    const ifaces = os.networkInterfaces();
    const ips = [];
    for (let dev in ifaces) {
        ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                ips.push(details.address);
            }
        });
    }
    return ips;
}

const formatDate = (function() {
    function fix(str) {
        str = '' + (str || '');
        return str.length <= 1 ? '0' + str : str;
    }
    var maps = {
        yyyy: function(date) {
            return date.getFullYear();
        },
        MM: function(date) {
            return fix(date.getMonth() + 1);
        },
        dd: function(date) {
            return fix(date.getDate());
        },
        HH: function(date) {
            return fix(date.getHours());
        },
        mm: function(date) {
            return fix(date.getMinutes());
        },
        ss: function(date) {
            return fix(date.getSeconds());
        }
    };

    const trunk = new RegExp(Object.keys(maps).join('|'), 'g');
    return function(value, format) {
        format = format || 'yyyy-MM-dd HH:mm';
        value = new Date(value);

        return format.replace(trunk, function(capture) {
            return maps[capture] ? maps[capture](value) : '';
        });
    };
})();

exports.normalizePluginName = normalizePluginName;
exports.getExternalIp = _.memoize(getExternalIp);
exports.isWritableStream = isWritableStream;
exports.isReadableStream = isReadableStream;
exports.noopMiddleware = noopMiddleware;
exports.getCert = _.memoize(getCert);
exports.isAcceptGzip = isAcceptGzip;
exports.openBrowser = openBrowser;
exports.isRespGzip = isRespGzip;
exports.formatDate = formatDate;
exports.isHtmlType = isHtmlType;
exports.nodeCall = nodeCall;
exports.typeOf = typeOf;
exports.npCall = npCall;
exports.clone = clone;
exports.is = is;
