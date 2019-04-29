class IO {
    constructor({ server, config }) {
        const io = (this._io = require('socket.io')(server));
        io.on('message', (data) => this._handleMessage(data));
        io.on('connection', (data) => this._handleConnection(data));
    }

    _handleMessage(data) {}

    _handleConnection(data) {}
}

module.exports = IO;
