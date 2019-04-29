const io = require('socket.io-client');
const svrx = (window.__svrx__ = {});

const events = (svrx.events = require('./events')({}));
const socket = initSocket(events);

function initSocket(events) {
    const socket = io.connect(location.origin);

    socket.on('start', (data) => {
        console.log(data);
    });

    return socket;
}

svrx.socket = socket;
