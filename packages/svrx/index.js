const Svrx = require('./lib/svrx');

function mapSvrxToExports(ctx) {
  function reload() {
    return ctx.events.emit('file:change', {}, true);
  }

  function start() {
    return new Promise(resolve => ctx.start(resolve));
  }

  function close() {
    return new Promise(resolve => ctx.close(resolve));
  }

  const forExports = {};

  forExports.__svrx = ctx;

  forExports.start = start;
  forExports.close = close;
  forExports.reload = reload;

  forExports.on = ctx.events.on.bind(ctx.events);
  forExports.off = ctx.events.off.bind(ctx.events);
  forExports.emit = ctx.events.emit.bind(ctx.events);

  return forExports;
}

function create(options) {
  return mapSvrxToExports(new Svrx(options));
}

module.exports = create;

create.create = create;
