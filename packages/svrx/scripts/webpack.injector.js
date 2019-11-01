
const path = require('path');

const INJECTOR_PATH = path.join(__dirname, '../lib/injector');

const config = {

  entry: path.join(INJECTOR_PATH, 'client/index.js'),
  output: {
    filename: 'client.js',
    library: '__svrx__',
    path: path.join(INJECTOR_PATH, 'dist'),
    libraryTarget: 'umd',
  },
  externals: { __svrx__: '__svrx__' },
  mode: 'production',

};

module.exports = config;
