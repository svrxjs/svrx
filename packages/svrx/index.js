const { EVENTS } = require('./lib/constant');
const Svrx = require('./lib/svrx');

function mapSvrxToExports(ctx) {
  function reload() {
    ctx.events.emit(EVENTS.FILE_CHANGE);
    return ctx;
  }

  function start() {
    return new Promise(resolve => ctx.start(resolve));
  }

  const forExports = {};

  forExports.__svrx = ctx;

  forExports.start = start;
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
