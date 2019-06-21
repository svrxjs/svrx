const events = require('../../shared/events');
const io = require('../../io/client.js');

const svrx = {
  _getScopedInstance: getScopedInstance,
  events: events({}),
  io,
};

function getConfig(name) {
  return ['get', 'set', 'splice', 'unset', ''].reduce((api, right) => {
    api[right] = function () {
      const args = [].slice.call(arguments);
      return io.call('$.config', { scope: name, command: right, params: args });
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

module.exports = svrx;
