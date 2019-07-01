// @WARNING: client script, dont require unnessary resource
const ioClient = require('socket.io-client');
const events = require('../shared/events');
const cache = require('../shared/cache');
const uid = require('../shared/uid');

const io = (module.exports = {});
const eventObject = events();
const origin = window.location.origin;
const socket = ioClient.connect(origin);

io._socket = socket;

io.call = (function () {
  const MAX_LIMIT_SERVICES = 500;

  const CALLBACK_CACHE = cache({
    limit: MAX_LIMIT_SERVICES,
    onError() {
      throw Error('max caller size limit exceeded');
    },
  });

  const MAX_CALL_TIMEOUT = 2000;

  socket.on('$onCall', (evt) => {
    const callId = evt.callId;
    const handler = CALLBACK_CACHE.get(callId);
    if (handler) {
      handler(evt);
      CALLBACK_CACHE.del(callId);
    }
  });

  function onCall(callId, callback) {
    CALLBACK_CACHE.set(callId, callback);
  }

  return function call(serviceName, payload) {
    return new Promise((resolve, reject) => {
      const callId = uid();
      socket.emit('$call', {
        serviceName,
        payload,
        callId,
      });
      onCall(callId, (evt) => {
        if (evt.error) {
          reject(new Error(evt.error));
        } else {
          resolve(evt.data);
        }
      });
      setTimeout(() => {
        CALLBACK_CACHE.del(callId);
        reject(new Error(`call ${serviceName} timeout exceeded`));
      }, MAX_CALL_TIMEOUT);
    });
  };
}());

io.emit = (type, payload)=>{
  socket.emit('$message', {type, payload})
}
io.on = (type, callback)=>{
  eventObject.on(type, callback);
}

io.off = (type, callback)=>{
  eventObject.off(type, callback);
}

// one endpoint to distribute message
socket.on('$message', ({ type, payload }) => {
  eventObject.emit(type, payload);
});
