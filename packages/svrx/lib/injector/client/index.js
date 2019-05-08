const events = require('../../shared/events');
const svrx = {
    events: events({}),
    io: require('../../io/client.js')
};

module.exports = svrx;
