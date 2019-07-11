const cosmiconfig = require('cosmiconfig');
const userHome = require('user-home');
const path = require('path');
const fs = require('fs');

const readGlobal = () => {
  const configRoot = process.env.SVRX_DIR;
  if (!configRoot && !userHome) {
    return {};
  }

  const root = configRoot || path.resolve(userHome, '.svrx');
  const configPath = `${root}/config/.svrxrc.js`;

  if (fs.existsSync(configPath)) {
    return require(configPath); // eslint-disable-line
  }
  return {};
};

const readScope = () => {
  const explorer = cosmiconfig('svrx', {
    searchPlaces: ['.svrxrc.js', 'svrx.config.js'],
  });
  const result = explorer.searchSync();
  if (result && !result.isEmpty) {
    this._rcFilePath = result.filepath;
    return result.config;
  }
  return {};
};

module.exports = () => {
  const globalConfig = readGlobal();
  const scopeConfig = readScope();

  return Object.assign(globalConfig, scopeConfig);
};
