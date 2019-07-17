const cosmiconfig = require('cosmiconfig');
const userHome = require('user-home');
const path = require('path');
const fs = require('fs');

const RC_FILES = ['.svrxrc.js', 'svrx.config.js'];
const readGlobal = () => {
  const configRoot = process.env.SVRX_DIR;
  if (!configRoot && !userHome) {
    return {};
  }

  const root = configRoot || path.resolve(userHome, '.svrx');
  const fileName = RC_FILES.find(file => fs.existsSync(`${root}/config/${file}`));

  if (fileName) {
    return {...require(`${root}/config/${fileName}`)}; // eslint-disable-line
  }

  return {};
};

const readScope = () => {
  const explorer = cosmiconfig('svrx', {
    searchPlaces: RC_FILES,
  });
  const result = explorer.searchSync();
  if (result && !result.isEmpty) {
    return result.config;
  }
  return {};
};

module.exports = () => {
  const globalConfig = readGlobal();
  const scopeConfig = readScope();

  return Object.assign(globalConfig, scopeConfig);
};
