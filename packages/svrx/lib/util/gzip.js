const { gzip, gunzip } = require('zlib');
const { promisify } = require('util');

module.exports = {
  gzip: promisify(gzip),
  gunzip: promisify(gunzip),
};
