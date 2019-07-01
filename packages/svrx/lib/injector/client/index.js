const events = require('../../shared/events');
const io = require('../../io/client.js');

function getConfig(...args) {
  const [name] = args;
  return ['get', 'set', 'splice', 'unset', ''].reduce((api, right) => {
    api[right] = () => {
      const params = [].slice.call(args);
      return io.call('$.config', { scope: name, command: right, params });
    };
    return api;
  }, {});
}

function getScopedInstance(name) {
  return {
    io,
    config: name ? getConfig(name) : getConfig(),
  };
}

const svrx = {
  _getScopedInstance: getScopedInstance,
  events: events({}),
  io,
};

module.exports = svrx;
