
const Svrx = require('../lib/svrx');

async function getProxyServer() {
  return this;
}


function createServer(inlineOptions = {}, cliOptions = {}) {
  inlineOptions.livereload = false;
  inlineOptions.open = inlineOptions.open || false;
  return new Svrx(inlineOptions, cliOptions);
}

exports.getProxyServer = getProxyServer;
exports.createServer = createServer;
