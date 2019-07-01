// safe listening port
const EventEmitter = require('events');
const libPath = require('path');
const libFs = require('fs');
const _ = require('lodash');
const os = require('os');

const CONST = require('../constant');

const o2str = {}.toString;
const { slice } = [];

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
  const combineName = n => (n.indexOf(CONST.PLUGIN_PREFIX) !== 0 ? CONST.PLUGIN_PREFIX + n : n);
  const isScoped = name.indexOf('/') >= 0;

  if (isScoped) {
    const matches = /^@(\w+)\/(.*)$/.exec(name);
    if (matches.length === 3) {
      const scope = matches[1];
      const realName = matches[2];
      return `@${scope}/${combineName(realName)}`;
    }
  }
  return combineName(name);
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
  const read = type => libFs.readFileSync(libPath.join(__dirname, `../../resource/cert/rootCA.${type}`), 'utf8');
  return {
    cert: read('crt'),
    key: read('key'),
  };
}

function getExternalIp() {
  const ifaces = os.networkInterfaces();
  const ips = [];

  Object.keys(ifaces).forEach((dev) => {
    ifaces[dev].forEach((details) => {
      if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
        ips.push(details.address);
      }
    });
  });
  return ips;
}

const formatDate = (function getFormatDate() {
  function fix(str) {
    str = `${str || ''}`;
    return str.length <= 1 ? `0${str}` : str;
  }
  const maps = {
    yyyy(date) {
      return date.getFullYear();
    },
    MM(date) {
      return fix(date.getMonth() + 1);
    },
    dd(date) {
      return fix(date.getDate());
    },
    HH(date) {
      return fix(date.getHours());
    },
    mm(date) {
      return fix(date.getMinutes());
    },
    ss(date) {
      return fix(date.getSeconds());
    },
  };

  const trunk = new RegExp(Object.keys(maps).join('|'), 'g');
  return (value, format) => {
    format = format || 'yyyy-MM-dd HH:mm';
    value = new Date(value);

    return format.replace(trunk, capture => (maps[capture] ? maps[capture](value) : ''));
  };
}());

function getByteLength(content) {
  if (Buffer.isBuffer(content)) {
    return content.length;
  } if (typeof content === 'string') {
    return Buffer.byteLength(content);
  }
  return 0;
}

exports.normalizePluginName = normalizePluginName;
exports.getExternalIp = _.memoize(getExternalIp);
exports.isWritableStream = isWritableStream;
exports.isReadableStream = isReadableStream;
exports.noopMiddleware = noopMiddleware;
exports.getByteLength = getByteLength;
exports.getCert = _.memoize(getCert);
exports.isAcceptGzip = isAcceptGzip;
exports.isRespGzip = isRespGzip;
exports.formatDate = formatDate;
exports.isHtmlType = isHtmlType;
exports.nodeCall = nodeCall;
exports.typeOf = typeOf;
exports.npCall = npCall;
exports.clone = clone;
exports.is = is;
