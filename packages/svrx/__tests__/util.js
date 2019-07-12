
const Svrx = require('../lib/svrx');

async function getProxyServer() {
  return this;
}


function createServer(option) {
  option = option || {};
  option.livereload = false;
  option.open = option.open || false;
  return new Svrx(option);
}

exports.getProxyServer = getProxyServer;
exports.createServer = createServer;
