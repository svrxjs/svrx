const events = require('../../shared/events');
const io = require('../../io/client.js');

function getConfig(name) {
  return ['get', 'set', 'splice', 'unset'].reduce((api, right) => {
    api[right] = (...params) => io.call('$.config', { scope: name, command: right, params });
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
