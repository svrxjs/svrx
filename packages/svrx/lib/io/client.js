// @WARNING: client script, dont require unnessary resource
const ioClient = require('socket.io-client');
const qwest = require('qwest');
const events = require('../shared/events');
const { IO_PATH } = require('../shared/consts');

const io = {};
module.exports = io;
const eventObject = events();
const { origin } = window.location;
const socket = ioClient.connect(origin, {
  path: IO_PATH,
  transports: ['websocket'],
});

socket.on('reconnect_attempt', () => {
  const { transports } = socket.io.opts;
  if (transports.length === 1 && transports[0] === 'websocket') {
    /* eslint-disable no-console */
    console.log('[svrx] try websocket failed, falling back to long polling...');
    socket.io.opts.transports = ['polling', 'websocket'];
  }
});

io._socket = socket;

io.call = (function getCall() {
  return function call(serviceName, payload) {
    return qwest
      .post(IO_PATH, {
        serviceName,
        payload,
      }, {
        dataType: 'json',
      })
      .then((xhr, data) => data);
  };
}());

io.emit = (type, payload) => {
  socket.emit('$message', { type, payload });
};
io.on = (type, callback) => {
  eventObject.on(type, callback);
};

io.off = (type, callback) => {
  eventObject.off(type, callback);
};

// one endpoint to distribute message
socket.on('$message', ({ type, payload }) => {
  eventObject.emit(type, payload);
});
